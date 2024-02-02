"""Input file value objects."""
from __future__ import annotations
from typing import BinaryIO, Protocol, Optional


class AbstractInputFile(Protocol):
    """An individual file to be read as part of a protocol.

    Properties:
        filename: The basename, including extension, of the file.
        file: A [file](https://docs.python.org/3/glossary.html#term-file-object)
            providing the contents of the protocol to be read.
    """

    filename: Optional[str]
    file: BinaryIO
