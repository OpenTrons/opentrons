"""App exception handlers."""
from logging import getLogger
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from traceback import format_exception, format_exception_only
from typing import Any, Callable, Coroutine, Dict, Optional, Sequence, Type, Union

from robot_server.constants import V1_TAG
from .global_errors import UnexpectedError, BadRequest, InvalidRequest

from .error_responses import (
    ApiError,
    ErrorSource,
    BaseErrorResponse,
    LegacyErrorResponse,
    MultiErrorResponse,
)


log = getLogger(__name__)


def _route_is_legacy(request: Request) -> bool:
    """Check if router handling the request is a legacy v1 endpoint."""
    router = request.scope.get("router")
    if router:
        for route in router.routes:
            if route.endpoint == request.scope.get("endpoint"):
                return V1_TAG in route.tags

    return False


def _format_validation_source(
    parts: Sequence[Union[str, int]]
) -> Optional[ErrorSource]:
    """Format a validation location from FastAPI into an ErrorSource."""
    try:
        if parts[0] == "body":
            # ["body", "model", "field"] > { "pointer": "/field" }
            return ErrorSource(pointer=f"/{'/'.join(str(p) for p in parts[2::])}")
        elif parts[0] == "query":
            # ["query", "param"] > { parameter: "param" }
            return ErrorSource(parameter=str(parts[1]))
        elif parts[0] == "header":
            # ["header", "name"] > { header: "name" }
            return ErrorSource(header=str(parts[1]))
    except KeyError:
        pass

    return None


async def handle_api_error(request: Request, error: ApiError) -> JSONResponse:
    """Map an API error to its response."""
    log.warning(
        f"Error response: {error.status_code} - "
        f"{error.content.get('id', 'LegacyError')} - "
        f"{error.content.get('detail', error.content.get('message', ''))}"
    )

    return JSONResponse(
        status_code=error.status_code,
        content=error.content,
    )


async def handle_framework_error(
    request: Request,
    error: StarletteHTTPException,
) -> JSONResponse:
    """Map an HTTP exception from the framework to an API response."""
    if _route_is_legacy(request):
        response: BaseErrorResponse = LegacyErrorResponse(message=error.detail)
    else:
        response = BadRequest(detail=error.detail)

    return await handle_api_error(request, response.as_error(error.status_code))


async def handle_validation_error(
    request: Request,
    error: RequestValidationError,
) -> JSONResponse:
    """Map a validation error from the framework to an API response."""
    validation_errors = error.errors()

    if _route_is_legacy(request):
        message = "; ".join(
            f"{'.'.join([str(v) for v in val_error['loc']])}: {val_error['msg']}"
            for val_error in validation_errors
        )
        response: BaseErrorResponse = LegacyErrorResponse(message=message)
    else:
        response = MultiErrorResponse(
            errors=[
                InvalidRequest(
                    detail=val_error["msg"],
                    source=_format_validation_source(val_error["loc"]),
                )
                for val_error in validation_errors
            ]
        )

    return await handle_api_error(
        request,
        response.as_error(status.HTTP_422_UNPROCESSABLE_ENTITY),
    )


async def handle_unexpected_error(request: Request, error: Exception) -> JSONResponse:
    """Map an unhandled Exception to an API response."""
    detail = "".join(format_exception_only(type(error), error)).strip()
    stacktrace = "".join(
        format_exception(type(error), error, error.__traceback__, limit=-5)
    ).strip()

    if _route_is_legacy(request):
        response: BaseErrorResponse = LegacyErrorResponse(message=detail)
    else:
        response = UnexpectedError(detail=detail, meta={"stacktrace": stacktrace})

    return await handle_api_error(
        request,
        response.as_error(status.HTTP_500_INTERNAL_SERVER_ERROR),
    )


exception_handlers: Dict[
    Union[int, Type[Exception]],
    Callable[[Request, Any], Coroutine[Any, Any, Response]],
] = {
    ApiError: handle_api_error,
    StarletteHTTPException: handle_framework_error,
    RequestValidationError: handle_validation_error,
    Exception: handle_unexpected_error,
}
