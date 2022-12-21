"""Smoke tests for the ContextCreator factory."""
import pytest
import asyncio
from functools import partial
from typing import AsyncIterable

from opentrons_shared_data.deck.dev_types import RobotModel

from opentrons.protocol_runner.python_context_creator import PythonContextCreator
from opentrons.hardware_control import API as HardwareAPI
from opentrons.protocol_api_experimental import ProtocolContext, DeckSlotName
from opentrons.protocol_engine import (
    create_protocol_engine,
    ProtocolEngine,
    DeckSlotLocation,
    Config as EngineConfig,
)


@pytest.fixture
async def protocol_engine(
    hardware: HardwareAPI,
    robot_model: RobotModel,
) -> AsyncIterable[ProtocolEngine]:
    """Get a ProtocolEngine wired to a simulating HardwareAPI."""
    engine = await create_protocol_engine(
        hardware_api=hardware, config=EngineConfig(robot_type=robot_model)
    )
    engine.play()
    yield engine
    await engine.finish()


async def test_creates_protocol_context(protocol_engine: ProtocolEngine) -> None:
    """It should return a ProtocolContext."""
    subject = PythonContextCreator()
    result = subject.create(protocol_engine=protocol_engine)

    assert isinstance(result, ProtocolContext)


async def test_wires_protocol_context_to_engine(
    protocol_engine: ProtocolEngine,
) -> None:
    """Smoke test the returned ProtocolContext by running a command."""
    subject = PythonContextCreator()
    context = subject.create(protocol_engine=protocol_engine)

    # run a ProtocolContext command in a ThreadPoolExecutor to validate
    # commands are going to the engine across the thread boundary
    result = await asyncio.get_running_loop().run_in_executor(
        executor=None,
        func=partial(
            context.load_labware,
            load_name="opentrons_96_tiprack_300ul",
            location="1",
        ),
    )

    labware_location = protocol_engine.state_view.labware.get_location(
        labware_id=result.labware_id
    )

    assert labware_location == DeckSlotLocation(slotName=DeckSlotName.SLOT_1)
