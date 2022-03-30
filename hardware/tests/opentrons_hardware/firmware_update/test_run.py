"""Tests for run module."""
from typing import Iterator

import mock
import pytest
from mock import AsyncMock, MagicMock

from opentrons_hardware.firmware_bindings.messages.message_definitions import (
    FirmwareUpdateStartApp,
)
from opentrons_hardware.firmware_update import (
    FirmwareUpdateInitiator,
    FirmwareUpdateDownloader,
    FirmwareUpdateEraser,
    run_update,
    head,
)


@pytest.fixture
def mock_initiator_run() -> Iterator[AsyncMock]:
    """Mock run function."""
    with mock.patch.object(FirmwareUpdateInitiator, "run") as p:
        yield p


@pytest.fixture
def mock_downloader_run() -> Iterator[AsyncMock]:
    """Mock run function."""
    with mock.patch.object(FirmwareUpdateDownloader, "run") as p:
        yield p


@pytest.fixture
def mock_eraser_run() -> Iterator[AsyncMock]:
    """Mock run function."""
    with mock.patch.object(FirmwareUpdateEraser, "run") as p:
        yield p


@pytest.mark.parametrize(argnames=["should_erase"], argvalues=[[True], [False]])
async def test_run_update(
    mock_initiator_run: AsyncMock,
    mock_downloader_run: AsyncMock,
    mock_eraser_run: AsyncMock,
    should_erase: bool,
) -> None:
    """It should call all the functions."""
    mock_messenger = AsyncMock()
    mock_hex = MagicMock()
    target = head
    await run_update(
        messenger=mock_messenger,
        target=target,
        hex_processor=mock_hex,
        retry_count=12,
        timeout_seconds=11,
        erase=should_erase,
    )
    mock_initiator_run.assert_called_once_with(
        target=target, retry_count=12, ready_wait_time_sec=11
    )
    if should_erase:
        mock_eraser_run.assert_called_once_with(
            node_id=target.bootloader_node, timeout_sec=11
        )
    else:
        mock_eraser_run.assert_not_called()
    mock_downloader_run.assert_called_once_with(
        node_id=target.bootloader_node, hex_processor=mock_hex, ack_wait_seconds=11
    )
    mock_messenger.send.assert_called_once_with(
        node_id=head.bootloader_node, message=FirmwareUpdateStartApp()
    )
