"""MQTT topics for server-emitted notifications.

These are the MQTT functional equivalent of HTTP endpoints.
Each topic should generally be named after the HTTP endpoint whose data it's reflecting.

It's helpful to have these centralized in this one file so we can see all the topics
that we currently support.
"""

from typing import NewType
import re


TopicName = NewType("TopicName", str)
"""A string suitable for the server to use as an MQTT topic to publish on."""


_TOPIC_BASE = TopicName("robot-server")


def _is_valid_topic_name_level(level: str) -> bool:
    """Return whether a string is valid as a level (segment) in an MQTT topic name."""
    return not re.match("[/#+]", level)


MAINTENANCE_RUNS_CURRENT_RUN = TopicName(f"{_TOPIC_BASE}/maintenance_runs/current_run")
RUNS_COMMANDS_LINKS = TopicName(f"{_TOPIC_BASE}/runs/commands_links")
# todo(mm, 2024-07-24): We actually publish on subtopics of /runs. Convert this to a
# function like we do for clientData.
RUNS = TopicName(f"{_TOPIC_BASE}/runs")
DECK_CONFIGURATION = TopicName(f"{_TOPIC_BASE}/deck_configuration")
RUNS_PRE_SERIALIZED_COMMANDS = TopicName(f"{_TOPIC_BASE}/runs/pre_serialized_commands")
LABWARE_OFFSETS = TopicName(f"{_TOPIC_BASE}/labwareOffsets")


def client_data(key: str) -> TopicName:
    """Return the dynamic MQTT topic name for the given clientData key."""
    base = f"{_TOPIC_BASE}/clientData"
    if _is_valid_topic_name_level(key):
        return TopicName(f"{base}/{key}")
    else:
        raise ValueError(
            f"{repr(key)} is not valid as a segment in an MQTT topic name."
        )
