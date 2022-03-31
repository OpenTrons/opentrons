"""Hex file tools."""
from __future__ import annotations
from pathlib import Path
from dataclasses import dataclass
from enum import Enum
from typing import Iterable, List, Generator
import binascii
import struct
import logging

from typing_extensions import Final


log = logging.getLogger(__name__)


class RecordType(int, Enum):
    """Enumeration of hex file record types."""

    Data = 0
    EOF = 1
    ExtendedSegmentAddress = 2
    StartSegmentAddress = 3
    ExtendedLinearAddress = 4
    StartLinearAddress = 5


@dataclass(frozen=True)
class HexRecord:
    """Represents a parsed line in a hex file."""

    byte_count: int
    address: int
    record_type: RecordType
    data: bytes
    checksum: int


class HexFileException(BaseException):
    """Base of all hex file exceptions."""

    pass


class MalformedLineException(HexFileException):
    """Line is malformed."""

    pass


class ChecksumException(HexFileException):
    """Wrong checksum."""

    pass


class StartAddressException(HexFileException):
    """Start address error."""

    pass


class BadChunkSizeException(HexFileException):
    """Invalid chunk size."""

    pass


def from_hex_file_path(file_path: Path) -> Iterable[HexRecord]:
    """A generator that processes a hex file at file_path."""
    with file_path.open() as hex_file:
        for line in hex_file.readlines():
            yield process_line(line)


def from_hex_contents(data: str) -> Iterable[HexRecord]:
    """A generator that processes a hex file contents."""
    for line in data.splitlines():
        yield process_line(line)


def process_line(line: str) -> HexRecord:
    """Convert a line in a HEX file into a HexRecord."""
    if len(line) < 11:
        # 11 = 1 (':') + 2 (byte count) + 4 (address) + 2 (record type) + 2 (checksum)
        raise MalformedLineException(f"Line is missing fields '{line}'")

    if line[0] != ":":
        raise MalformedLineException(f"Missing ':' in '{line}'")

    # Skip the ':' and strip
    binary_line = binascii.unhexlify(line[1:].rstrip())

    # byte 0 is byte count
    byte_count = binary_line[0]
    # bytes 1, 2 for address
    address = struct.unpack(">H", binary_line[1:3])[0]
    # byte 3 is record type
    try:
        record_type = RecordType(binary_line[3])
    except ValueError:
        raise MalformedLineException(f"'{binary_line[3]}' is not a valid record type.")

    # 5 is 1 for byte count, 2 for address, 1 for record type, and 1 for checksum
    if len(binary_line) != (byte_count + 5):
        raise MalformedLineException("Incorrect byte count")

    byte_count_index: Final = 4
    checksum_index: Final = byte_count_index + byte_count

    # byte_count of data
    data = binary_line[byte_count_index:checksum_index]

    # Checksum from line
    checksum = binary_line[checksum_index]
    # compute checksum
    computed_checksum = 0xFF & (~sum(binary_line[:checksum_index]) + 1)

    if computed_checksum != checksum:
        raise ChecksumException(f"Expected {checksum} but computed {computed_checksum}")

    return HexRecord(
        byte_count=byte_count,
        address=address,
        record_type=record_type,
        data=data,
        checksum=checksum,
    )


@dataclass(frozen=True)
class Chunk:
    """A chunk of memory."""

    address: int
    data: List[int]


class HexRecordProcessor:
    """Process an iterable of hex records.

    Iterate through the process generator to get data chunks and start_address.
    """

    def __init__(self, records: Iterable[HexRecord]) -> None:
        """Constructor."""
        self._records = records
        self._start_address: int = 0

    @classmethod
    def from_file(cls, file_path: Path) -> HexRecordProcessor:
        """Construct from file."""
        return HexRecordProcessor(from_hex_file_path(file_path))

    @classmethod
    def from_content(cls, file_path: Path) -> HexRecordProcessor:
        """Construct from file."""
        return HexRecordProcessor(from_hex_file_path(file_path))

    @property
    def start_address(self) -> int:
        """Get the start address.

        Only valid after process completes.
        """
        return self._start_address

    def process(self, chunk_size: int) -> Generator[Chunk, None, None]:  # noqa: C901
        """Process the records.

        Args:
            chunk_size: The number of bytes in each chunk.

        Returns:
            Generates chunks.

        """
        if chunk_size <= 0:
            raise BadChunkSizeException("chunk size must be greater than 0.")

        # Address offset set by the StartLinearAddress record type
        address_offset = 0
        # The accumulated buffer that will yield a new Chunk
        buffer: List[int] = []
        # The start address of the next yielded Chunk
        chunk_addr = 0

        for record in self._records:
            if record.record_type == RecordType.Data:
                addr = record.address + address_offset
                if not buffer:
                    # There's nothing in our buffer. This record's address will be
                    # the next chunk's address.
                    chunk_addr = addr
                elif addr != (chunk_addr + len(buffer)):
                    # This new record is not contiguous. Yield the previous one.
                    yield Chunk(address=chunk_addr, data=buffer)
                    buffer = []
                    chunk_addr = addr

                for byte in record.data:
                    buffer.append(byte)
                    if len(buffer) == chunk_size:
                        # Yield chunk.
                        yield Chunk(address=chunk_addr, data=buffer)
                        chunk_addr += len(buffer)
                        buffer = []
            elif record.record_type == RecordType.StartLinearAddress:
                self._start_address = struct.unpack(">L", record.data)[0]
                log.debug(f"Start address {self._start_address}")
            elif record.record_type == RecordType.ExtendedLinearAddress:
                address_offset = struct.unpack(">H", record.data)[0] << 16
                log.debug(f"New offset to {address_offset}")
            elif record.record_type == RecordType.EOF:
                if len(buffer):
                    # Still something in our buffer. Yield it.
                    yield Chunk(address=chunk_addr, data=buffer)
                log.debug("Got EOF.")
                break
            elif (
                record.record_type == RecordType.StartSegmentAddress
                or record.record_type == RecordType.ExtendedSegmentAddress
            ):
                # x86 specific. Ignoring.
                log.warning(f"Found record type {record.record_type}. Ignoring.")
