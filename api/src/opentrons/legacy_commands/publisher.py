import functools
import inspect
from contextlib import contextmanager
from typing import Any, Callable, Iterator, Optional, TypeVar, cast
from uuid import uuid4

from opentrons.legacy_broker import LegacyBroker

from .types import (
    COMMAND as COMMAND_TOPIC,
    Command as CommandPayload,
    CommandMessage,
    MessageSequenceId,
)


class CommandPublisher:
    """An object with a `Broker` dependency used to publish commands."""

    def __init__(self, broker: Optional[LegacyBroker]) -> None:
        """Initialize the publisher with a Broker."""
        self._broker = broker or LegacyBroker()

    @property
    def broker(self) -> LegacyBroker:
        """Get the publisher's Broker."""
        return self._broker

    @broker.setter
    def broker(self, broker: LegacyBroker) -> None:
        """Set the publisher's Broker."""
        self._broker = broker


CommandPayloadCreator = Callable[..., CommandPayload]
"""A function that creates a Command dictionary message."""

FuncT = TypeVar("FuncT", bound=Callable[..., Any])
"""A function wrapped by the @publish decorator."""


def publish(command: CommandPayloadCreator) -> Callable[[FuncT], FuncT]:
    """Publish messages before and after the decorated function has run."""

    def _decorator(func: FuncT) -> FuncT:
        @functools.wraps(func)
        def _decorated(*args: Any, **kwargs: Any) -> Any:
            """Use the args passed to wrapped `func` to build the message payload.

            1. Inspect signature of `func` and bind arguments to signature to map
               argument names to called (and/or default) values.
            2. Inspect signature of `command` and map values from `func` call to
               argument names expected by `command`.
            3. Map `self` argument of `func` to the `instrument` argument of `command`,
               where applicable.
            4. Construct the command payload and publish it using `publish_context`
            5. Return the value of calling `func` with `*args` and `**kwargs`
            """

            broker = getattr(args[0], "broker", None)

            assert isinstance(
                broker, LegacyBroker
            ), "Only methods of CommandPublisher classes should be decorated."

            func_sig = _inspect_signature(func)
            bound_func_args = func_sig.bind(*args, **kwargs)
            bound_func_args.apply_defaults()
            func_args = bound_func_args.arguments

            message_creator_sig = _inspect_signature(command)
            message_creator_arg_names = set(message_creator_sig.parameters.keys())
            message_creator_args = {
                n: func_args[n] for n in message_creator_arg_names if n in func_args
            }

            # TODO (artyom, 20170927): we are doing this to be able to use
            # the decorator in Instrument class methods, in which case
            # self is effectively an instrument.
            # To narrow the scope of this hack, we are checking if the
            # command is expecting instrument first.
            # We are also checking if call arguments have 'self' and
            # don't have instruments specified, in which case
            # instruments should take precedence.
            if (
                "instrument" in message_creator_arg_names
                and "instrument" not in message_creator_args
                and "self" in func_args
            ):
                message_creator_args["instrument"] = func_args["self"]

            command_message = command(**message_creator_args)

            with publish_context(broker=broker, command=command_message):
                return func(*args, **kwargs)

        return cast(FuncT, _decorated)

    return _decorator


@contextmanager
def publish_context(broker: LegacyBroker, command: CommandPayload) -> Iterator[None]:
    """Publish messages before and after the `with` block has run.

    If an `error` is raised in the `with` block, it will be published in the "after"
    message and re-raised.
    """
    message_id = str(uuid4())
    _do_publish(broker=broker, message_id=message_id, command=command, when="before")

    try:
        yield
    except Exception as error:
        _do_publish(
            broker=broker,
            message_id=message_id,
            command=command,
            when="after",
            error=error,
        )
        raise
    else:
        _do_publish(broker=broker, message_id=message_id, command=command, when="after")


@functools.lru_cache(maxsize=None)
def _inspect_signature(func: Callable[..., Any]) -> inspect.Signature:
    """Inspect function signatures, memoized because it is called very often."""
    return inspect.signature(func)


def _do_publish(
    broker: LegacyBroker,
    message_id: str,
    command: CommandPayload,
    when: MessageSequenceId,
    error: Optional[Exception] = None,
) -> None:
    """Publish a command to the broker from the decorator or ContextManager."""
    name = command["name"]
    payload = command["payload"]
    message: CommandMessage = {  # type: ignore[assignment, misc]
        "$": when,
        "id": message_id,
        "name": name,
        "payload": payload,
        "error": error,
    }

    if when == "before":
        payload_str = ", ".join(f"{k}: {v}" for k, v in payload.items() if k != "text")
        broker.logger.info(f"{name}: {payload_str}")

    broker.publish(topic=COMMAND_TOPIC, message=message)
