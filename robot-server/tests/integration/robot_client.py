from __future__ import annotations
import asyncio

from pathlib import Path
from typing import AsyncGenerator, List
import httpx
from httpx import Response

import concurrent.futures
import contextlib


STARTUP_WAIT = 15
SHUTDOWN_WAIT = 15


class RobotClient:
    """HTTP-API client for a robot."""

    def __init__(
        self,
        httpx_client: httpx.AsyncClient,
        worker_executor: concurrent.futures.ThreadPoolExecutor,
        host: str,
        port: str,
    ) -> None:
        """Initialize the client."""
        self.base_url: str = f"{host}:{port}"
        self.httpx_client: httpx.AsyncClient = httpx_client
        self.worker_executor: concurrent.futures.ThreadPoolExecutor = worker_executor

    @staticmethod
    @contextlib.asynccontextmanager
    async def make(
        host: str, port: str, version: str
    ) -> AsyncGenerator[RobotClient, None]:
        with concurrent.futures.ThreadPoolExecutor() as worker_executor:
            async with httpx.AsyncClient(
                headers={"opentrons-version": version}
            ) as httpx_client:
                yield RobotClient(
                    httpx_client=httpx_client,
                    worker_executor=worker_executor,
                    host=host,
                    port=port,
                )

    async def alive(self) -> bool:
        """Are /health and /openapi.json both reachable?"""
        try:
            await self.get_health()
            await self.get_openapi()
            return True
        except (httpx.ConnectError, httpx.HTTPStatusError):
            return False

    async def dead(self) -> bool:
        """Are /health and /openapi.json both unreachable?"""
        try:
            await self.get_health()
            return False
        except httpx.HTTPStatusError:
            return False
        except httpx.ConnectError:
            pass
        try:
            await self.get_openapi()
            return False
        except httpx.HTTPStatusError:
            return False
        except httpx.ConnectError:
            # Now both /health and /openapi.json have returned ConnectError.
            return True

    async def _poll_for_alive(self) -> None:
        """Retry the /health and /openapi.json until both reachable."""
        while not await self.alive():
            # Avoid spamming the server in case a request immediately
            # returns some kind of "not ready."
            await asyncio.sleep(0.1)

    async def _poll_for_dead(self) -> None:
        """Poll the /health and /openapi.json until both unreachable."""
        while not await self.dead():
            # Avoid spamming the server in case a request immediately
            # returns some kind of "not ready."
            await asyncio.sleep(0.1)

    async def wait_until_alive(self, timeout_sec: float = STARTUP_WAIT) -> bool:
        try:
            await asyncio.wait_for(self._poll_for_alive(), timeout=timeout_sec)
            return True
        except asyncio.TimeoutError:
            return False

    async def wait_until_dead(self, timeout_sec: float = SHUTDOWN_WAIT) -> bool:
        """Retry the /health and /openapi.json until both unreachable."""
        try:
            await asyncio.wait_for(self._poll_for_dead(), timeout=timeout_sec)
            return True
        except asyncio.TimeoutError:
            return False

    async def get_health(self) -> Response:
        """GET /health."""
        response = await self.httpx_client.get(url=f"{self.base_url}/health")
        response.raise_for_status()
        return response

    async def get_openapi(self) -> Response:
        """GET /openapi.json."""
        response = await self.httpx_client.get(url=f"{self.base_url}/openapi.json")
        response.raise_for_status()
        return response

    async def get_protocols(self) -> Response:
        """GET /protocols."""
        response = await self.httpx_client.get(url=f"{self.base_url}/protocols")
        response.raise_for_status()
        return response

    async def get_protocol(self, protocol_id: str) -> Response:
        """GET /protocols/{protocol_id}."""
        response = await self.httpx_client.get(
            url=f"{self.base_url}/protocols/{protocol_id}"
        )
        return response

    async def post_protocol(self, files: List[Path]) -> Response:
        """POST /protocols."""
        file_payload = []
        for file in files:
            file_payload.append(("files", open(file, "rb")))
        response = await self.httpx_client.post(
            url=f"{self.base_url}/protocols", files=file_payload
        )
        response.raise_for_status()
        return response

    async def analysis_complete(self, protocol_id: str, analyses_id: str) -> bool:
        """Is an analysis status complete?"""
        response = await self.get_protocol(protocol_id)
        analyses = response.json()["data"]["analyses"]
        target_analysis = next(
            (analysis for analysis in analyses if analysis["id"] == analyses_id), None
        )
        if not target_analysis:
            raise KeyError(f"Analysis id {analyses_id} not found.")
        return bool(target_analysis["status"] == "completed")

    async def _poll_analysis_complete(self, protocol_id: str, analyses_id: str) -> None:
        while not await self.analysis_complete(protocol_id, analyses_id):
            # Avoid spamming the server in case a request immediately
            # returns some kind of "not ready."
            await asyncio.sleep(0.1)

    async def wait_for_analysis_complete(
        self, protocol_id: str, analysis_id: str, timeout_sec: float
    ) -> bool:
        """Retry until analysis status is complete or timeout."""
        try:
            await asyncio.wait_for(
                self._poll_analysis_complete(protocol_id, analysis_id),
                timeout=timeout_sec,
            )
            return True
        except asyncio.TimeoutError:
            return False

    async def delete_run(self, run_id: str) -> Response:
        """DELETE /runs/{run_id}."""
        response = await self.httpx_client.delete(f"{self.base_url}/runs/{run_id}")
        response.raise_for_status()
        return response
