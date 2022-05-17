"""
Entrypoint for the buildroot update server
"""
import asyncio
import logging

from . import get_app, constants

from otupdate.common import name_management, cli, systemd
from aiohttp import web

LOG = logging.getLogger(__name__)


def main() -> None:
    parser = cli.build_root_parser()
    args = parser.parse_args()
    loop = asyncio.get_event_loop()
    systemd.configure_logging(getattr(logging, args.log_level.upper()))

    LOG.info("Setting static hostname")
    hostname = loop.run_until_complete(name_management.set_up_static_hostname())
    LOG.info(f"Set static hostname to {hostname}")

    LOG.info("Building buildroot update server")
    app = get_app(args.version_file, args.config_file)

    name = app[constants.DEVICE_NAME_VARNAME]  # Set by get_app().

    LOG.info(f"Setting Avahi service name to {name}")
    try:
        loop.run_until_complete(name_management.set_avahi_service_name(name))
    except Exception:
        LOG.exception(
            "Error setting the Avahi service name."
            " mDNS + DNS-SD advertisement may not work."
        )

    LOG.info(f"Notifying {systemd.SOURCE} that service is up")
    systemd.notify_up()

    LOG.info(f"Starting buildroot update server on http://{args.host}:{args.port}")
    web.run_app(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
