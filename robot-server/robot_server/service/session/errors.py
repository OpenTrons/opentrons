from robot_server.service.errors import RobotServerError, CommonErrorDef


class SessionException(RobotServerError):
    """Base of all session exceptions"""

    def __init__(self, reason: str):
        super().__init__(definition=CommonErrorDef.ACTION_FORBIDDEN, reason=reason)


class SessionCommandException(SessionException):
    """Base of all command exceptions"""

    pass


class SessionCreationException(SessionException):
    """A session cannot be created"""

    pass


class UnsupportedCommandException(SessionCommandException):
    """A command is not supported by the session"""

    pass


class CommandExecutionException(SessionCommandException):
    """An error occurred during command execution"""

    pass
