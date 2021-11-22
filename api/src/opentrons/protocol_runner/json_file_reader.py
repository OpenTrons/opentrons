"""JSON file reading."""

from opentrons.protocols.models import JsonProtocol
from opentrons.protocol_reader import ProtocolSource


class JsonFileReader:
    """Reads and parses JSON protocol files."""

    @staticmethod
    def read(protocol_file: ProtocolSource) -> JsonProtocol:
        """Read and parse file into a JsonProtocol model."""
        return JsonProtocol.parse_file(protocol_file.main_file)
