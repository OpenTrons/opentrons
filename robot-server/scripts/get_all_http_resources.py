"""Try retrieving all persistent HTTP resources.

This script:

1. Recursively fetches all of a server's runs, all of those runs' commands, etc.
2. Checks for server errors in any of the responses
3. Optionally saves the response bodies to the local filesystem for inspection.

It is meant to help screen for things like backwards compatibility bugs in the server's
persistent storage layer, which will usually raise a HTTP 5XX error if you fetch the
affected resource.

You can point this script at a dev server running at localhost and it should complete
within a few seconds, or a real robot on the network and it should complete within a
few minutes.

Running this is a little bit finicky because we import from our local `tests` "package".
This works: `pipenv run python -m scripts.get_all_http_resources`
This does not: `pipenv run python scripts/get_all_http_resources.py`
"""


# todo(mm, 2025-01-14): Consider unifying this implementation with
# tests/integration/http_api/persistence/test_compatibility.py.


from __future__ import annotations

import argparse
import asyncio
import json
import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import AsyncIterator, NoReturn

import httpx

from tests.integration.robot_client import RobotClient


# Certain endpoints are paginated and currently have no nice way to disable pagination.
# As a workaround, we request a page length of a very high number.
_MAX_PAGE_LENGTH = 1_000_000


async def _run() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "host",
        help="the host where we can find the robot server, optionally with a port, e.g. 192.168.1.123 or localhost:31950",
    )
    parser.add_argument(
        "--out-dir",
        default=None,
        help="a directory to save a copy of all response bodies",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        default=False,
        help="clear and overwrite the output directory if it already exists",
    )

    args = parser.parse_args()
    host: str = args.host
    out_dir: Path | None = Path(args.out_dir) if args.out_dir is not None else None
    overwrite: bool = args.overwrite

    if port_match := re.fullmatch("(.*):([0-9]+)", host):
        host = port_match.group(1)
        port = int(port_match.group(2))
    else:
        port = 31950

    if out_dir is not None:
        _prepare_output_dir(out_dir, overwrite)

    error_count = 0

    async for event in _traverse_http_resources(host, port):
        if not event.ok:
            error_count += 1

        relative_path, contents = event.file

        if out_dir:
            path = out_dir / relative_path
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(contents)
        else:
            path = None

        print(
            ("ok " if event.ok else "ERR")
            + " "
            + event.relative_url
            + (" -> " + str(path) if path is not None else "")
        )

    print(f"{error_count} error(s)")


async def _traverse_http_resources(
    host: str, port: int
) -> AsyncIterator[_ResourceEvent]:
    async with RobotClient.make(
        base_url=f"http://{host}:{port}", version="*"
    ) as robot_client:
        async for event in _traverse_runs(robot_client):
            yield event
        async for event in _traverse_protocols(robot_client):
            yield event
        async for event in _traverse_labware_offsets(robot_client):
            yield event


@dataclass(frozen=True)
class _ResourceEvent:
    """A resource that indicated  a server-side error."""

    response: httpx.Response
    ok_override: bool | None = None

    @property
    def ok(self) -> bool:
        """Whether this resource should be reported as an error.

        This generally means that the server returned an error status code.
        In addition to that, certain endpoints will have their response bodies
        more deeply inspected.
        """
        if self.ok_override:
            return self.ok_override

        try:
            self.response.raise_for_status()
        except httpx.HTTPStatusError:
            return False
        else:
            return True

    @property
    def relative_url(self) -> str:
        """The URL of this resource.

        e.g. if the resource was at "http://localhost:31950/runs/abc/commands/123?k=v",
        this will return "runs/abc/commands/123?k=v".
        """
        return self.response.url.raw_path.decode("utf-8")

    @property
    def file(self) -> tuple[Path, bytes]:
        """A file representing the response body of this resource.

        The path is a relative path that will match the resource URL, e.g.
        "http://localhost:31950/runs/abc/commands/123?k=v" will become "runs/abc/commands/123?k=v.json".
        The bytes are the bytes of the response body, possibly reformatted for human readability.
        """
        try:
            response_json = self.response.json()
        except json.JSONDecodeError:
            contents = self.response.content
            file_extension = ".txt"
        else:
            contents = json.dumps(response_json, indent=2).encode(
                self.response.encoding or "utf-8"
            )
            file_extension = ".json"

        path = Path(*(self.relative_url.split("/")))
        path = path.with_name(path.name + file_extension)
        assert not path.is_absolute()

        return (path, contents)


async def _traverse_runs(robot_client: RobotClient) -> AsyncIterator[_ResourceEvent]:
    try:
        all_run_summaries = await robot_client.get_runs(length=_MAX_PAGE_LENGTH)
        run_ids = [
            run_summary["id"] for run_summary in all_run_summaries.json()["data"]
        ]
    except httpx.HTTPStatusError as e:
        all_run_summaries = e.response
        run_ids = []
    yield _ResourceEvent(response=all_run_summaries)

    for run_id in run_ids:
        try:
            run = await robot_client.get_run(run_id)
        except httpx.HTTPStatusError as e:
            run = e.response
        yield _ResourceEvent(response=run, ok_override=run.json()["data"]["ok"])

        async for event in _traverse_run_commands(robot_client, run_id):
            yield event


async def _traverse_run_commands(
    robot_client: RobotClient, run_id: str
) -> AsyncIterator[_ResourceEvent]:
    try:
        all_command_summaries = await robot_client.get_run_commands(
            run_id=run_id, cursor=0, page_length=_MAX_PAGE_LENGTH
        )
        all_command_ids = [
            command_summary["id"]
            for command_summary in all_command_summaries.json()["data"]
        ]
    except httpx.HTTPStatusError as e:
        all_command_summaries = e.response
        all_command_ids = []
    yield _ResourceEvent(response=all_command_summaries)

    for command_id in all_command_ids:
        try:
            command = await robot_client.get_run_command(
                run_id=run_id, command_id=command_id
            )
        except httpx.HTTPStatusError as e:
            command = e.response
        yield _ResourceEvent(response=command)


async def _traverse_protocols(
    robot_client: RobotClient,
) -> AsyncIterator[_ResourceEvent]:
    try:
        all_protocol_summaries = await robot_client.get_protocols()
        protocol_ids = [
            protocol_summary["id"]
            for protocol_summary in all_protocol_summaries.json()["data"]
        ]
    except httpx.HTTPStatusError as e:
        all_protocol_summaries = e.response
        protocol_ids = []
    yield _ResourceEvent(response=all_protocol_summaries)

    for protocol_id in protocol_ids:
        try:
            protocol = await robot_client.get_protocol(protocol_id)
        except httpx.HTTPStatusError as e:
            protocol = e.response
        yield _ResourceEvent(response=protocol)

        async for event in _traverse_protocol_analyses(robot_client, protocol_id):
            yield event


async def _traverse_protocol_analyses(
    robot_client: RobotClient,
    protocol_id: str,
) -> AsyncIterator[_ResourceEvent]:
    try:
        all_analysis_summaries = await robot_client.get_analyses(protocol_id)
        analysis_ids = [
            analysis["id"] for analysis in all_analysis_summaries.json()["data"]
        ]
    except httpx.HTTPStatusError as e:
        all_analysis_summaries = e.response
        analysis_ids = []
    yield _ResourceEvent(response=all_analysis_summaries)

    for analysis_id in analysis_ids:
        try:
            analysis = await robot_client.get_analysis(protocol_id, analysis_id)
        except httpx.HTTPStatusError as e:
            analysis = e.response
        yield _ResourceEvent(response=analysis)

        try:
            analysis_as_document = await robot_client.get_analysis_as_document(
                protocol_id, analysis_id
            )
        except httpx.HTTPStatusError as e:
            analysis_as_document = e.response
        yield _ResourceEvent(response=analysis_as_document)


async def _traverse_labware_offsets(
    robot_client: RobotClient,
) -> AsyncIterator[_ResourceEvent]:
    try:
        response = await robot_client.get_labware_offsets()
    except httpx.HTTPStatusError as e:
        response = e.response
    yield _ResourceEvent(response=response)


def _prepare_output_dir(output_dir: Path, overwrite: bool) -> None:
    if output_dir.exists():
        if overwrite:
            try:
                shutil.rmtree(output_dir)
            except NotADirectoryError:
                _fatal_error(
                    f"{output_dir} already exists, as something other than a directory."
                )
        else:
            _fatal_error(f"{output_dir} already exists. Try --overwrite.")

    output_dir.mkdir(parents=True, exist_ok=False)


def _fatal_error(message: str) -> NoReturn:
    print("Error: " + message, file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    asyncio.run(_run())
