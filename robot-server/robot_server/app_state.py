"""Global application state.

Mostly, this serves as a place to store singletons as well as
in-memory databases.
"""
from fastapi import Request, WebSocket
from starlette.datastructures import State as AppState
from typing import cast, Generic, Optional, TypeVar


ValueT = TypeVar("ValueT")


class AppStateValue(Generic[ValueT]):
    """A helper to get and set values on `AppState` in a type-safe way.

    Normally, `AppState` is a loosely-typed bag of attributes,
    which opens the door to silly mistakes:

    .. code-block::
        app_state.my_field = 123

        x = app_state.my_fild  # Typo, but not caught by type-checker.
        y: str = app_state.my_field  # Wrong type, but not caught by type-checker.

    With this class, this becomes:

    .. code-block::
        my_field = AppStateValue[int]("my_field")
        my_field.set_on(app_state, 123)

        x = my_fild.get_from(app_state)  # Type-checking error: misspelled variable.
        y: str = my_field.get_from(app_state)  # Type-checking error: not a str.
    """

    def __init__(self, key: str) -> None:
        """Initialize the value wrapper with a key in state.

        Arguments:
            key: Unique key on which to store the value. Must be
                unique across all keys used.
        """
        self._key = key

    def get_from(self, app_state: AppState) -> Optional[ValueT]:
        """Get the value from state, returning None if not present."""
        return cast(
            Optional[ValueT],
            getattr(app_state, self._key, None),
        )

    def set_on(self, app_state: AppState, value: Optional[ValueT]) -> None:
        """Set the value on state."""
        setattr(app_state, self._key, value)


async def get_app_state(
    # NOTE: both of these must be typed as non-optional to allow FastAPI's
    # dependency injection magic to work, but must have default values of
    # None in order to function at runtime, as only one will be present
    request: Request = cast(Request, None),
    websocket: WebSocket = cast(WebSocket, None),
) -> AppState:
    """Get the global application's state from the framework.

    Muse be used with FastAPI's dependency injection system via fastapi.Depends.

    See https://www.starlette.io/applications/#storing-state-on-the-app-instance
    for more details about the application state object.

    Arguments:
        request: The request object, injected by FastAPI. Will be `None` if the
            endpoint is a websocket endpoint.
        websocket: The websocket object, injected by FastAPI. Will be `None` if
            the endpoint is a regular HTTP endpoint.

    Returns:
        A dictionary-like object containing global application state.
    """
    request_scope = request or websocket
    return cast(AppState, request_scope.app.state)


__all__ = ["AppState", "get_app_state"]
