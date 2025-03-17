class UpdateError(RuntimeError):
    pass


class AbsorbanceReaderDisconnectedError(RuntimeError):
    def __init__(self, serial: str):
        self.serial = serial
