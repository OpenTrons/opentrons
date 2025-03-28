#!/usr/bin/env python3

"""Generate a JSON schema representing the server's settings."""

from sys import argv
from robot_server.settings import RobotServerSettings

if __name__ == "__main__":
    with open(argv[1], "w") as f:
        f.write(RobotServerSettings.schema_json(indent=2))
