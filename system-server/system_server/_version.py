import sys
import logging

_pyversion = sys.version_info[0:2]

if _pyversion >= (3, 8):
    from importlib import metadata
else:
    import importlib_metadata as metadata  # type: ignore[no-redef]

try:
    version: str = metadata.version("system_server")  # type: ignore[attr-defined]
except Exception as e:
    logging.warning(
        "Could not determine version for system_server, may be dev install, using 0.0.0-dev"
    )
    logging.debug(e)
    version = "0.0.0-dev"

__all__ = ["version"]
