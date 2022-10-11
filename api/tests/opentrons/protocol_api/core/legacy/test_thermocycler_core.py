"""Tests for the legacy Protocol API module core implementations."""
import pytest
from decoy import Decoy

from typing import List

from opentrons.types import Mount, Location, Point
from opentrons.drivers.types import ThermocyclerLidStatus
from opentrons.hardware_control import SynchronousAdapter, SyncHardwareAPI
from opentrons.hardware_control.types import Axis
from opentrons.hardware_control.modules import Thermocycler, TemperatureStatus
from opentrons.hardware_control.modules.types import (
    ThermocyclerModuleModel,
    ThermocyclerStep,
)
from opentrons.protocols.geometry.module_geometry import ThermocyclerGeometry

from opentrons.protocol_api.labware import Labware, Well
from opentrons.protocol_api.core.protocol_api.protocol_context import (
    ProtocolContextImplementation,
)
from opentrons.protocol_api.core.protocol_api.legacy_module_core import (
    LegacyThermocyclerCore,
    create_module_core,
)
from opentrons.protocol_api.core.protocol_api.instrument_context import (
    InstrumentContextImplementation,
)

SyncThermocyclerHardware = SynchronousAdapter[Thermocycler]


@pytest.fixture
def mock_sync_hardware_api(decoy: Decoy) -> SyncHardwareAPI:
    """Get a mock sync hardware API."""
    return decoy.mock(cls=SyncHardwareAPI)


@pytest.fixture
def mock_protocol_core(
    decoy: Decoy, mock_sync_hardware_api: SyncHardwareAPI
) -> ProtocolContextImplementation:
    """Get a mock protocol core."""
    mock_protocol_core = decoy.mock(cls=ProtocolContextImplementation)
    decoy.when(mock_protocol_core.get_hardware()).then_return(mock_sync_hardware_api)
    return mock_protocol_core


@pytest.fixture
def mock_geometry(decoy: Decoy) -> ThermocyclerGeometry:
    """Get a mock thermocycler geometry."""
    return decoy.mock(cls=ThermocyclerGeometry)


@pytest.fixture
def mock_sync_module_hardware(decoy: Decoy) -> SyncThermocyclerHardware:
    """Get a mock module hardware control interface."""
    return decoy.mock(name="SyncThermocyclerHardware")  # type: ignore[no-any-return]


@pytest.fixture
def mock_instrument_core(decoy: Decoy) -> InstrumentContextImplementation:
    """Get a mock instrument core."""
    return decoy.mock(cls=InstrumentContextImplementation)


@pytest.fixture
def mock_labware(decoy: Decoy) -> Labware:
    """Get a mock labware."""
    return decoy.mock(cls=Labware)


@pytest.fixture
def mock_well(decoy: Decoy) -> Well:
    """Get a mock well."""
    return decoy.mock(cls=Well)


@pytest.fixture
def subject(
    mock_geometry: ThermocyclerGeometry,
    mock_protocol_core: ProtocolContextImplementation,
    mock_sync_module_hardware: SyncThermocyclerHardware,
) -> LegacyThermocyclerCore:
    """Get a legacy module implementation core with mocked out dependencies."""
    return LegacyThermocyclerCore(
        requested_model=ThermocyclerModuleModel.THERMOCYCLER_V1,
        protocol_core=mock_protocol_core,
        geometry=mock_geometry,
        sync_module_hardware=mock_sync_module_hardware,
    )


def test_create(
    decoy: Decoy,
    mock_geometry: ThermocyclerGeometry,
    mock_protocol_core: ProtocolContextImplementation,
) -> None:
    """It should be able to create a thermocycler module core."""
    mock_module_hardware_api = decoy.mock(cls=Thermocycler)
    result = create_module_core(
        geometry=mock_geometry,
        protocol_core=mock_protocol_core,
        module_hardware_api=mock_module_hardware_api,
        requested_model=ThermocyclerModuleModel.THERMOCYCLER_V1,
    )

    assert isinstance(result, LegacyThermocyclerCore)


def test_get_lid_position(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the current lid position."""
    decoy.when(mock_sync_module_hardware.lid_status).then_return(
        ThermocyclerLidStatus.OPEN
    )
    result = subject.get_lid_position()
    assert result == "open"


def test_get_block_temperature_status(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the current block temperature status."""
    decoy.when(mock_sync_module_hardware.status).then_return(TemperatureStatus.IDLE)
    result = subject.get_block_temperature_status()
    assert result == "idle"


def test_get_lid_temperature_status(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the current lid temperature status."""
    decoy.when(mock_sync_module_hardware.lid_temp_status).then_return(
        TemperatureStatus.IDLE
    )
    result = subject.get_lid_temperature_status()
    assert result == "idle"


def test_get_block_temperature(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the current block temperature."""
    decoy.when(mock_sync_module_hardware.temperature).then_return(12.3)
    result = subject.get_block_temperature()
    assert result == 12.3


def test_get_block_target_temperature(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the target block temperature."""
    decoy.when(mock_sync_module_hardware.target).then_return(12.3)
    result = subject.get_block_target_temperature()
    assert result == 12.3


def test_get_lid_temperature(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the current lid temperature."""
    decoy.when(mock_sync_module_hardware.lid_temp).then_return(42.0)
    result = subject.get_lid_temperature()
    assert result == 42.0


def test_get_lid_target_temperature(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the current lid temperature."""
    decoy.when(mock_sync_module_hardware.lid_target).then_return(42.0)
    result = subject.get_lid_target_temperature()
    assert result == 42.0


def test_get_ramp_rate(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the ramp rate."""
    decoy.when(mock_sync_module_hardware.ramp_rate).then_return(1.23)
    result = subject.get_ramp_rate()
    assert result == 1.23


def test_get_hold_time(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the hold time."""
    decoy.when(mock_sync_module_hardware.hold_time).then_return(13.37)
    result = subject.get_hold_time()
    assert result == 13.37


def test_get_total_cycle_count(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the total cycle count."""
    decoy.when(mock_sync_module_hardware.total_cycle_count).then_return(321)
    result = subject.get_total_cycle_count()
    assert result == 321


def test_get_current_cycle_index(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the current cycle index."""
    decoy.when(mock_sync_module_hardware.current_cycle_index).then_return(123)
    result = subject.get_current_cycle_index()
    assert result == 123


def test_get_total_step_count(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the total step count."""
    decoy.when(mock_sync_module_hardware.total_step_count).then_return(1337)
    result = subject.get_total_step_count()
    assert result == 1337


def test_get_current_step_index(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should report the current step index."""
    decoy.when(mock_sync_module_hardware.current_step_index).then_return(42)
    result = subject.get_current_step_index()
    assert result == 42


def test_open_lid(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    mock_sync_hardware_api: SyncHardwareAPI,
    mock_protocol_core: ProtocolContextImplementation,
    mock_instrument_core: InstrumentContextImplementation,
    mock_labware: Labware,
    mock_well: Well,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should open the lid with the hardware."""
    decoy.when(mock_protocol_core.get_loaded_instruments()).then_return(
        {Mount.RIGHT: mock_instrument_core}
    )
    decoy.when(mock_instrument_core.get_mount()).then_return(Mount.RIGHT)
    decoy.when(mock_sync_hardware_api.current_position(Mount.RIGHT)).then_return(
        {Axis.A: 4}
    )
    decoy.when(subject._get_fixed_trash()).then_return(mock_labware)
    decoy.when(mock_labware.wells()).then_return([mock_well])
    decoy.when(mock_well.top()).then_return(
        Location(point=Point(x=1, y=2, z=3), labware=mock_well)
    )

    decoy.when(mock_sync_module_hardware.open()).then_return("open")

    result = subject.open_lid()

    decoy.verify(
        mock_sync_hardware_api.retract(Mount.RIGHT),
        mock_instrument_core.move_to(
            Location(Point(x=1, y=2, z=4), None),
            force_direct=True,
            minimum_z_height=None,
            speed=None,
        ),
    )
    assert result == "open"


def test_close_lid(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    mock_sync_hardware_api: SyncHardwareAPI,
    mock_protocol_core: ProtocolContextImplementation,
    mock_instrument_core: InstrumentContextImplementation,
    mock_labware: Labware,
    mock_well: Well,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should close the lid with the hardware."""
    decoy.when(mock_protocol_core.get_loaded_instruments()).then_return(
        {Mount.LEFT: mock_instrument_core}
    )
    decoy.when(mock_instrument_core.get_mount()).then_return(Mount.LEFT)
    decoy.when(mock_sync_hardware_api.current_position(Mount.LEFT)).then_return(
        {Axis.Z: 4}
    )
    decoy.when(subject._get_fixed_trash()).then_return(mock_labware)
    decoy.when(mock_labware.wells()).then_return([mock_well])
    decoy.when(mock_well.top()).then_return(
        Location(point=Point(x=1, y=2, z=3), labware=mock_well)
    )

    decoy.when(mock_sync_module_hardware.close()).then_return("close")

    result = subject.close_lid()

    decoy.verify(
        mock_sync_hardware_api.retract(Mount.LEFT),
        mock_instrument_core.move_to(
            Location(Point(x=1, y=2, z=4), None),
            force_direct=True,
            minimum_z_height=None,
            speed=None,
        ),
    )
    assert result == "close"


def test_set_block_temperature(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should set the block temperature with the hardware."""
    subject.set_block_temperature(
        celsius=42.0,
        hold_time_seconds=1.2,
        hold_time_minutes=3.4,
        ramp_rate=5.6,
        block_max_volume=7.8,
    )

    decoy.verify(
        mock_sync_module_hardware.set_temperature(
            temperature=42.0,
            hold_time_seconds=1.2,
            hold_time_minutes=3.4,
            ramp_rate=5.6,
            volume=7.8,
        ),
        times=1,
    )


def test_set_lid_temperature(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should set the lid temperature with the hardware."""
    subject.set_lid_temperature(celsius=42.0)

    decoy.verify(mock_sync_module_hardware.set_lid_temperature(temperature=42.0))


@pytest.mark.parametrize(
    "steps",
    [
        [{"temperature": 42.0, "hold_time_minutes": 12.3, "hold_time_seconds": 45.6}],
        [{"temperature": 42.0, "hold_time_seconds": 45.6}],
        [{"temperature": 42.0, "hold_time_minutes": 12.3}],
        [],
    ],
)
def test_execute_profile(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    steps: List[ThermocyclerStep],
    subject: LegacyThermocyclerCore,
) -> None:
    """It should execute a valid profile with the hardware."""
    subject.execute_profile(steps=steps, repetitions=12, block_max_volume=34.5)

    decoy.verify(
        mock_sync_module_hardware.cycle_temperatures(
            steps=steps, repetitions=12, volume=34.5
        )
    )


@pytest.mark.parametrize(
    "repetitions",
    [0, -1, -999],
)
def test_execute_profile_invalid_repetitions_raises(
    repetitions: int,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should raise a ValueError when given non-positive repetition value."""
    with pytest.raises(ValueError):
        subject.execute_profile(steps=[], repetitions=repetitions)


@pytest.mark.parametrize(
    "steps",
    [
        [{"hold_time_minutes": 12.3, "hold_time_seconds": 45.6}],
        [{"temperature": 42.0}],
    ],
)
def test_execute_profile_invalid_steps_raises(
    steps: List[ThermocyclerStep],
    subject: LegacyThermocyclerCore,
) -> None:
    """It should raise a ValueError when given invalid thermocycler profile steps."""
    with pytest.raises(ValueError):
        subject.execute_profile(steps=steps, repetitions=1)


def test_deactivate_lid(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should turn off the heated lid with the hardware."""
    subject.deactivate_lid()

    decoy.verify(mock_sync_module_hardware.deactivate_lid(), times=1)


def test_deactivate_block(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should turn off the well block temperature controller with the hardware."""
    subject.deactivate_block()

    decoy.verify(mock_sync_module_hardware.deactivate_block(), times=1)


def test_deactivate(
    decoy: Decoy,
    mock_sync_module_hardware: SyncThermocyclerHardware,
    subject: LegacyThermocyclerCore,
) -> None:
    """It should turn off the well block and lid temperature with the hardware."""
    subject.deactivate()

    decoy.verify(mock_sync_module_hardware.deactivate(), times=1)
