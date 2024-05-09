import pytest
from multidict import istr
from pytest_lazyfixture import lazy_fixture  # type: ignore[import-untyped]
from decoy import Decoy
from typing import Union, Optional

from opentrons.protocols.api_support.types import APIVersion
from opentrons.protocol_engine import (
    ProtocolEngine,
    commands as pe_commands,
    CommandIntent,
)
from opentrons.protocol_engine.types import PostRunHardwareState
from opentrons.hardware_control import API as HardwareAPI
from opentrons.protocol_reader import JsonProtocolConfig, PythonProtocolConfig
from opentrons.protocol_runner.run_orchestrator import RunOrchestrator
from opentrons import protocol_runner
from opentrons.protocol_runner.protocol_runner import (
    JsonRunner,
    PythonAndLegacyRunner,
    LiveRunner,
    AnyRunner,
)
from robot_server.runs.run_models import Run


@pytest.fixture
def mock_protocol_python_runner(decoy: Decoy) -> PythonAndLegacyRunner:
    """Get a mocked out PythonAndLegacyRunner dependency."""
    return decoy.mock(cls=PythonAndLegacyRunner)


@pytest.fixture
def mock_protocol_json_runner(decoy: Decoy) -> JsonRunner:
    """Get a mocked out PythonAndLegacyRunner dependency."""
    return decoy.mock(cls=JsonRunner)


@pytest.fixture
def mock_setup_runner(decoy: Decoy) -> LiveRunner:
    """Get a mocked out LiveRunner dependency."""
    return decoy.mock(cls=LiveRunner)


@pytest.fixture
def mock_fixit_runner(decoy: Decoy) -> LiveRunner:
    """Get a mocked out LiveRunner dependency."""
    return decoy.mock(cls=LiveRunner)


@pytest.fixture
def mock_protocol_engine(decoy: Decoy) -> ProtocolEngine:
    """Get a mocked out ProtocolEngine dependency."""
    return decoy.mock(cls=ProtocolEngine)


@pytest.fixture
def mock_hardware_api(decoy: Decoy) -> HardwareAPI:
    """Get a mocked out HardwareAPI dependency."""
    return decoy.mock(cls=HardwareAPI)


@pytest.fixture
def json_protocol_subject(
    mock_protocol_engine: ProtocolEngine,
    mock_hardware_api: HardwareAPI,
    mock_protocol_json_runner: JsonRunner,
    mock_fixit_runner: LiveRunner,
    mock_setup_runner: LiveRunner
) -> RunOrchestrator:
    return RunOrchestrator(
        protocol_engine=mock_protocol_engine,
        hardware_api=mock_hardware_api,
        fixit_runner=mock_fixit_runner,
        setup_runner=mock_setup_runner,
        json_or_python_protocol_runner=mock_protocol_json_runner,
    )

@pytest.fixture
def python_protocol_subject(
    mock_protocol_engine: ProtocolEngine,
    mock_hardware_api: HardwareAPI,
    mock_protocol_python_runner: PythonAndLegacyRunner,
    mock_fixit_runner: LiveRunner,
    mock_setup_runner: LiveRunner
) -> RunOrchestrator:
    return RunOrchestrator(
        protocol_engine=mock_protocol_engine,
        hardware_api=mock_hardware_api,
        fixit_runner=mock_fixit_runner,
        setup_runner=mock_setup_runner,
        json_or_python_protocol_runner=mock_protocol_python_runner,
    )


@pytest.mark.parametrize(
    "input_protocol_config, mock_protocol_runner, subject",
    [
        (
            JsonProtocolConfig(schema_version=7),
            lazy_fixture("mock_protocol_json_runner"),
            lazy_fixture("json_protocol_subject")
        ),
        (
            PythonProtocolConfig(api_version=APIVersion(2, 14)),
            lazy_fixture("mock_protocol_python_runner"),
            lazy_fixture("python_protocol_subject")
        ),
        (None, None, lazy_fixture("python_protocol_subject")),
        (None, None, lazy_fixture("json_protocol_subject")),
    ],
)
def test_build_run_orchestrator_provider(
    decoy: Decoy,
    monkeypatch: pytest.MonkeyPatch,
    subject: RunOrchestrator,
    mock_protocol_engine: ProtocolEngine,
    mock_hardware_api: HardwareAPI,
    input_protocol_config: Optional[Union[PythonProtocolConfig, JsonProtocolConfig]],
    mock_setup_runner: LiveRunner,
    mock_fixit_runner: LiveRunner,
    mock_protocol_runner: Optional[Union[PythonAndLegacyRunner, JsonRunner]],
) -> None:
    mock_create_runner_func = decoy.mock(func=protocol_runner.create_protocol_runner)
    monkeypatch.setattr(protocol_runner, "create_protocol_runner", mock_create_runner_func)

    decoy.when(
        mock_create_runner_func(
            protocol_engine=mock_protocol_engine,
            hardware_api=mock_hardware_api,
            post_run_hardware_state=PostRunHardwareState.HOME_AND_STAY_ENGAGED,
            drop_tips_after_run=True,
        )
    ).then_return(mock_setup_runner)

    decoy.when(
        mock_create_runner_func(
            protocol_engine=mock_protocol_engine,
            hardware_api=mock_hardware_api,
            post_run_hardware_state=PostRunHardwareState.HOME_AND_STAY_ENGAGED,
            drop_tips_after_run=True,
        )
    ).then_return(mock_fixit_runner)

    decoy.when(
        mock_create_runner_func(
            protocol_config=input_protocol_config,
            protocol_engine=mock_protocol_engine,
            hardware_api=mock_hardware_api,
            post_run_hardware_state=PostRunHardwareState.HOME_AND_STAY_ENGAGED,
            drop_tips_after_run=True,
        )
    ).then_return(mock_fixit_runner)

    result = subject.build_orchestrator(
        protocol_engine=mock_protocol_engine,
        hardware_api=mock_hardware_api,
        protocol_config=input_protocol_config,
    )

    assert isinstance(result, RunOrchestrator)


@pytest.mark.parametrize(
    "runner, command_intent, subject",
    [
        (lazy_fixture("mock_setup_runner"), pe_commands.CommandIntent.SETUP, lazy_fixture("python_protocol_subject")),
        (lazy_fixture("mock_fixit_runner"), pe_commands.CommandIntent.FIXIT, lazy_fixture("python_protocol_subject")),
        (lazy_fixture("mock_setup_runner"), pe_commands.CommandIntent.SETUP, lazy_fixture("json_protocol_subject")),
        (lazy_fixture("mock_fixit_runner"), pe_commands.CommandIntent.FIXIT, lazy_fixture("json_protocol_subject")),
        (
            lazy_fixture("mock_protocol_json_runner"),
            pe_commands.CommandIntent.PROTOCOL,
            lazy_fixture("json_protocol_subject"),
        ),
        (
            lazy_fixture("mock_protocol_python_runner"),
            pe_commands.CommandIntent.PROTOCOL,
            lazy_fixture("python_protocol_subject"),
        ),
    ],
)
def test_add_command(
    subject: RunOrchestrator,
    decoy: Decoy,
    runner: AnyRunner,
    command_intent: pe_commands.CommandIntent,
) -> None:
    """Should verify calls to set_command_queued."""
    command_to_queue = pe_commands.HomeCreate.construct(
        intent=command_intent, params=pe_commands.HomeParams.construct()
    )
    decoy.when(runner.set_command_queued(command_to_queue)).then_return(command_to_queue)
    result = subject.add_command(command_to_queue)

    assert result == command_to_queue

    decoy.verify(runner.set_command_queued(command_to_queue))
