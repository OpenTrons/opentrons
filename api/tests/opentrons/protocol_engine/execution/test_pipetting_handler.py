"""Pipetting execution handler."""
from typing import cast

import pytest
from decoy import Decoy

from opentrons.types import Mount
from opentrons.hardware_control import API as HardwareAPI
from opentrons.hardware_control.dev_types import PipetteDict

from opentrons.protocol_engine.state.state import StateView
from opentrons.protocol_engine.state.pipettes import HardwarePipette
from opentrons.protocol_engine.state.labware import LabwareView
from opentrons.protocol_engine.state.wells import WellView
from opentrons.protocol_engine.types import TipGeometry
from opentrons.protocol_engine.execution.pipetting import (
    HardwarePipettingHandler,
    VirtualPipettingHandler,
    create_pipetting_handler,
)

from opentrons.protocol_engine.errors.exceptions import (
    TipNotAttachedError,
    InvalidAspirateVolumeError,
    InvalidPushOutVolumeError,
    InvalidDispenseVolumeError,
)
from opentrons.protocol_engine.notes import CommandNoteAdder, CommandNote
from ..note_utils import CommandNoteMatcher


from opentrons_shared_data.labware.labware_definition import (
    CuboidalFrustum,
    InnerWellGeometry,
    SphericalSegment,
    RectangularWellDefinition3,
)

_TEST_INNER_WELL_GEOMETRY = InnerWellGeometry(
    sections=[
        CuboidalFrustum(
            shape="cuboidal",
            topXDimension=7.6,
            topYDimension=8.5,
            bottomXDimension=5.6,
            bottomYDimension=6.5,
            topHeight=45,
            bottomHeight=20,
        ),
        CuboidalFrustum(
            shape="cuboidal",
            topXDimension=5.6,
            topYDimension=6.5,
            bottomXDimension=4.5,
            bottomYDimension=4.0,
            topHeight=20,
            bottomHeight=10,
        ),
        SphericalSegment(
            shape="spherical",
            radiusOfCurvature=6,
            topHeight=10,
            bottomHeight=0.0,
        ),
    ],
)


@pytest.fixture
def mock_hardware_api(decoy: Decoy) -> HardwareAPI:
    """Get a mock in the shape of a HardwareAPI."""
    return decoy.mock(cls=HardwareAPI)


@pytest.fixture
def mock_state_view(decoy: Decoy) -> StateView:
    """Get a mock in the shape of a StateView."""
    return decoy.mock(cls=StateView)


@pytest.fixture
def hardware_subject(
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
) -> HardwarePipettingHandler:
    """Get a HardwarePipettingHandler test subject."""
    return HardwarePipettingHandler(
        state_view=mock_state_view, hardware_api=mock_hardware_api
    )


@pytest.fixture
def mock_labware_view(decoy: Decoy) -> LabwareView:
    """Get a mock in the shape of a LabwareView."""
    return decoy.mock(cls=LabwareView)


@pytest.fixture
def mock_well_view(decoy: Decoy) -> WellView:
    """Get a mock in the shape of a WellView."""
    return decoy.mock(cls=WellView)


async def test_create_pipette_handler(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
) -> None:
    """It should return virtual or real tip handlers depending on config."""
    decoy.when(mock_state_view.config.use_virtual_pipettes).then_return(False)
    assert isinstance(
        create_pipetting_handler(
            state_view=mock_state_view, hardware_api=mock_hardware_api
        ),
        HardwarePipettingHandler,
    )

    decoy.when(mock_state_view.config.use_virtual_pipettes).then_return(True)
    assert isinstance(
        create_pipetting_handler(
            state_view=mock_state_view, hardware_api=mock_hardware_api
        ),
        VirtualPipettingHandler,
    )


@pytest.mark.parametrize(
    ("aspirated_volume", "ready_to_aspirate", "expected"),
    [
        (0.0, True, True),
        (1.0, True, True),
        (1.0, False, False),
    ],
)
def test_hw_get_is_ready_to_aspirate(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    hardware_subject: HardwarePipettingHandler,
    aspirated_volume: float,
    ready_to_aspirate: bool,
    expected: bool,
) -> None:
    """It should be ready to aspirate if state and HW agree that we're ready."""
    decoy.when(mock_hardware_api.attached_instruments).then_return({})
    decoy.when(mock_state_view.pipettes.get_aspirated_volume("pipette-id")).then_return(
        aspirated_volume
    )
    decoy.when(
        mock_state_view.pipettes.get_ready_to_aspirate("pipette-id")
    ).then_return(ready_to_aspirate)
    decoy.when(
        mock_state_view.pipettes.get_hardware_pipette("pipette-id", {})
    ).then_return(
        HardwarePipette(
            mount=Mount.RIGHT,
            config=cast(PipetteDict, {"ready_to_aspirate": ready_to_aspirate}),
        )
    )

    assert hardware_subject.get_is_ready_to_aspirate("pipette-id") == expected


def test_hw_get_is_ready_to_aspirate_raises_no_tip_attached(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    hardware_subject: HardwarePipettingHandler,
) -> None:
    """Should raise a TipNotAttachedError error."""
    decoy.when(mock_hardware_api.attached_instruments).then_return({})
    decoy.when(mock_state_view.pipettes.get_aspirated_volume("pipette-id")).then_raise(
        TipNotAttachedError()
    )
    decoy.when(
        mock_state_view.pipettes.get_hardware_pipette("pipette-id", {})
    ).then_return(
        HardwarePipette(
            mount=Mount.RIGHT,
            config=cast(PipetteDict, {"ready_to_aspirate": True}),
        )
    )

    with pytest.raises(TipNotAttachedError):
        assert hardware_subject.get_is_ready_to_aspirate("pipette-id")


async def test_hw_dispense_in_place(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    hardware_subject: HardwarePipettingHandler,
) -> None:
    """It should find the pipette by ID and use it to dispense."""
    decoy.when(mock_state_view.pipettes.get_aspirated_volume("pipette-id")).then_return(
        25
    )

    decoy.when(mock_hardware_api.attached_instruments).then_return({})
    decoy.when(
        mock_state_view.pipettes.get_hardware_pipette(
            pipette_id="pipette-id",
            attached_pipettes={},
        )
    ).then_return(
        HardwarePipette(
            mount=Mount.RIGHT,
            config=cast(
                PipetteDict,
                {
                    "aspirate_flow_rate": 1.23,
                    "dispense_flow_rate": 4.56,
                    "blow_out_flow_rate": 7.89,
                },
            ),
        )
    )

    result = await hardware_subject.dispense_in_place(
        pipette_id="pipette-id",
        volume=25,
        flow_rate=2.5,
        push_out=None,
        is_full_dispense=True,
    )

    assert result == 25

    decoy.verify(
        mock_hardware_api.set_flow_rate(
            mount=Mount.RIGHT, aspirate=None, dispense=2.5, blow_out=None
        ),
        await mock_hardware_api.dispense(
            mount=Mount.RIGHT,
            volume=25,
            push_out=None,
            correction_volume=0,
            is_full_dispense=True,
        ),
        mock_hardware_api.set_flow_rate(
            mount=Mount.RIGHT, aspirate=1.23, dispense=4.56, blow_out=7.89
        ),
    )


async def test_hw_dispense_in_place_raises_invalid_push_out(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    hardware_subject: HardwarePipettingHandler,
) -> None:
    """It should raise an InvalidPushOutVolumeError."""
    decoy.when(mock_state_view.pipettes.get_aspirated_volume("pipette-id")).then_return(
        25
    )

    decoy.when(mock_hardware_api.attached_instruments).then_return({})
    decoy.when(
        mock_state_view.pipettes.get_hardware_pipette(
            pipette_id="pipette-id",
            attached_pipettes={},
        )
    ).then_return(
        HardwarePipette(
            mount=Mount.RIGHT,
            config=cast(
                PipetteDict,
                {
                    "aspirate_flow_rate": 1.23,
                    "dispense_flow_rate": 4.56,
                    "blow_out_flow_rate": 7.89,
                },
            ),
        )
    )

    with pytest.raises(InvalidPushOutVolumeError):
        await hardware_subject.dispense_in_place(
            pipette_id="pipette-id",
            volume=25,
            flow_rate=2.5,
            push_out=-7,
            is_full_dispense=True,
        )


async def test_hw_aspirate_while_tracking(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    mock_labware_view: LabwareView,
    mock_well_view: WellView,
    hardware_subject: HardwarePipettingHandler,
    mock_command_note_adder: CommandNoteAdder,
) -> None:
    """Should set flow_rate and call hardware_api aspirate."""
    decoy.when(mock_labware_view.get_well_definition("labware-id", "A1")).then_return(
        RectangularWellDefinition3.model_construct(totalLiquidVolume=1100000)  # type: ignore[call-arg]
    )
    decoy.when(mock_labware_view.get_well_geometry("labware-id", "A1")).then_return(
        _TEST_INNER_WELL_GEOMETRY
    )

    decoy.when(mock_state_view.pipettes.get_working_volume("pipette-id")).then_return(
        25
    )
    decoy.when(mock_state_view.pipettes.get_aspirated_volume("pipette-id")).then_return(
        0
    )

    decoy.when(mock_hardware_api.attached_instruments).then_return({})
    decoy.when(
        mock_state_view.pipettes.get_hardware_pipette(
            pipette_id="pipette-id",
            attached_pipettes={},
        )
    ).then_return(
        HardwarePipette(
            mount=Mount.LEFT,
            config=cast(
                PipetteDict,
                {
                    "aspirate_flow_rate": 1.23,
                    "dispense_flow_rate": 4.56,
                    "blow_out_flow_rate": 7.89,
                },
            ),
        )
    )

    decoy.when(
        mock_state_view.geometry.get_liquid_handling_z_change(
            labware_id="labware-id", well_name="A1", operation_volume=25.0
        )
    ).then_return(4.544)

    result = await hardware_subject.aspirate_while_tracking(
        pipette_id="pipette-id",
        labware_id="labware-id",
        well_name="A1",
        volume=25,
        flow_rate=2.5,
        command_note_adder=mock_command_note_adder,
    )
    # make sure hw aspirate_while_tracking runs without error
    assert result == 25


async def test_hw_aspirate_in_place(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    hardware_subject: HardwarePipettingHandler,
    mock_command_note_adder: CommandNoteAdder,
) -> None:
    """Should set flow_rate and call hardware_api aspirate."""
    decoy.when(mock_state_view.pipettes.get_working_volume("pipette-id")).then_return(
        25
    )
    decoy.when(mock_state_view.pipettes.get_aspirated_volume("pipette-id")).then_return(
        0
    )

    decoy.when(mock_hardware_api.attached_instruments).then_return({})
    decoy.when(
        mock_state_view.pipettes.get_hardware_pipette(
            pipette_id="pipette-id",
            attached_pipettes={},
        )
    ).then_return(
        HardwarePipette(
            mount=Mount.LEFT,
            config=cast(
                PipetteDict,
                {
                    "aspirate_flow_rate": 1.23,
                    "dispense_flow_rate": 4.56,
                    "blow_out_flow_rate": 7.89,
                },
            ),
        )
    )

    result = await hardware_subject.aspirate_in_place(
        pipette_id="pipette-id",
        volume=25,
        flow_rate=2.5,
        command_note_adder=mock_command_note_adder,
    )

    assert result == 25

    decoy.verify(
        mock_hardware_api.set_flow_rate(
            mount=Mount.LEFT, aspirate=2.5, dispense=None, blow_out=None
        ),
        await mock_hardware_api.aspirate(
            mount=Mount.LEFT, volume=25, correction_volume=0
        ),
        mock_hardware_api.set_flow_rate(
            mount=Mount.LEFT, aspirate=1.23, dispense=4.56, blow_out=7.89
        ),
    )


async def test_virtual_blow_out_in_place(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    hardware_subject: HardwarePipettingHandler,
) -> None:
    """Should set flow_rate and call hardware_api blow-out."""
    decoy.when(mock_hardware_api.attached_instruments).then_return({})
    decoy.when(
        mock_state_view.pipettes.get_hardware_pipette(
            pipette_id="pipette-id",
            attached_pipettes={},
        )
    ).then_return(
        HardwarePipette(
            mount=Mount.LEFT,
            config=cast(
                PipetteDict,
                {
                    "aspirate_flow_rate": 1.23,
                    "dispense_flow_rate": 4.56,
                    "blow_out_flow_rate": 7.89,
                },
            ),
        )
    )

    await hardware_subject.blow_out_in_place(pipette_id="pipette-id", flow_rate=2.5)

    decoy.verify(
        mock_hardware_api.set_flow_rate(
            mount=Mount.LEFT, aspirate=None, dispense=None, blow_out=2.5
        ),
        await mock_hardware_api.blow_out(mount=Mount.LEFT),
        mock_hardware_api.set_flow_rate(
            mount=Mount.LEFT, aspirate=1.23, dispense=4.56, blow_out=7.89
        ),
    )


def test_virtual_get_is_ready_to_aspirate(
    decoy: Decoy, mock_state_view: StateView
) -> None:
    """Should check if pipette is ready to aspirate."""
    subject = VirtualPipettingHandler(state_view=mock_state_view)

    decoy.when(
        mock_state_view.pipettes.get_aspirated_volume(pipette_id="pipette-id")
    ).then_raise(TipNotAttachedError())

    decoy.when(
        mock_state_view.pipettes.get_ready_to_aspirate(pipette_id="pipette-id")
    ).then_return(True)

    with pytest.raises(TipNotAttachedError):
        subject.get_is_ready_to_aspirate(pipette_id="pipette-id")

    decoy.when(
        mock_state_view.pipettes.get_aspirated_volume(pipette_id="pipette-id-123")
    ).then_return(0)

    decoy.when(
        mock_state_view.pipettes.get_ready_to_aspirate(pipette_id="pipette-id-123")
    ).then_return(True)

    assert subject.get_is_ready_to_aspirate(pipette_id="pipette-id-123") is True

    decoy.when(
        mock_state_view.pipettes.get_ready_to_aspirate(pipette_id="pipette-id-123")
    ).then_return(False)

    assert subject.get_is_ready_to_aspirate(pipette_id="pipette-id-123") is False


async def test_virtual_aspirate_in_place(
    mock_state_view: StateView, decoy: Decoy, mock_command_note_adder: CommandNoteAdder
) -> None:
    """Should return the volume."""
    decoy.when(
        mock_state_view.pipettes.get_working_volume(pipette_id="pipette-id")
    ).then_return(3)

    decoy.when(
        mock_state_view.pipettes.get_aspirated_volume(pipette_id="pipette-id")
    ).then_return(1)

    subject = VirtualPipettingHandler(state_view=mock_state_view)

    decoy.when(mock_state_view.pipettes.get_attached_tip("pipette-id")).then_return(
        TipGeometry(length=1, diameter=2, volume=3)
    )

    result = await subject.aspirate_in_place(
        pipette_id="pipette-id",
        volume=2,
        flow_rate=5,
        command_note_adder=mock_command_note_adder,
    )
    assert result == 2


async def test_virtual_dispense_in_place(
    decoy: Decoy, mock_state_view: StateView
) -> None:
    """Should return the volume."""
    subject = VirtualPipettingHandler(state_view=mock_state_view)

    decoy.when(mock_state_view.pipettes.get_attached_tip("pipette-id")).then_return(
        TipGeometry(length=1, diameter=2, volume=3)
    )

    decoy.when(mock_state_view.pipettes.get_aspirated_volume("pipette-id")).then_return(
        3
    )

    result = await subject.dispense_in_place(
        pipette_id="pipette-id",
        volume=3,
        flow_rate=5,
        push_out=None,
        is_full_dispense=True,
    )
    assert result == 3


async def test_virtual_dispense_in_place_raises_invalid_push_out(
    decoy: Decoy, mock_state_view: StateView
) -> None:
    """Should raise an InvalidPushOutVolumeError."""
    subject = VirtualPipettingHandler(state_view=mock_state_view)

    decoy.when(mock_state_view.pipettes.get_attached_tip("pipette-id")).then_return(
        TipGeometry(length=1, diameter=2, volume=3)
    )

    with pytest.raises(InvalidPushOutVolumeError):
        await subject.dispense_in_place(
            pipette_id="pipette-id",
            volume=3,
            flow_rate=5,
            push_out=-7,
            is_full_dispense=False,
        )


async def test_virtual_dispense_in_place_raises_invalid_volume(
    decoy: Decoy, mock_state_view: StateView
) -> None:
    """Should raise an InvalidDispenseVolumeError."""
    subject = VirtualPipettingHandler(state_view=mock_state_view)

    decoy.when(mock_state_view.pipettes.get_attached_tip("pipette-id")).then_return(
        TipGeometry(length=1, diameter=2, volume=3)
    )

    decoy.when(mock_state_view.pipettes.get_aspirated_volume("pipette-id")).then_return(
        None
    )

    with pytest.raises(InvalidDispenseVolumeError):
        await subject.dispense_in_place(
            pipette_id="pipette-id",
            volume=3,
            flow_rate=5,
            push_out=7,
            is_full_dispense=False,
        )


async def test_virtual_aspirate_validate_tip_attached(
    mock_state_view: StateView, decoy: Decoy, mock_command_note_adder: CommandNoteAdder
) -> None:
    """Should raise an error that a tip is not attached."""
    subject = VirtualPipettingHandler(state_view=mock_state_view)

    decoy.when(mock_state_view.pipettes.get_attached_tip("pipette-id")).then_return(
        None
    )

    with pytest.raises(
        TipNotAttachedError, match="Cannot perform aspirate without a tip attached"
    ):
        await subject.aspirate_in_place(
            "pipette-id",
            volume=20,
            flow_rate=1,
            command_note_adder=mock_command_note_adder,
        )


async def test_virtual_dispense_validate_tip_attached(
    mock_state_view: StateView, decoy: Decoy
) -> None:
    """Should raise an error that a tip is not attached."""
    subject = VirtualPipettingHandler(state_view=mock_state_view)

    decoy.when(mock_state_view.pipettes.get_attached_tip("pipette-id")).then_return(
        None
    )

    with pytest.raises(
        TipNotAttachedError, match="Cannot perform dispense without a tip attached"
    ):
        await subject.dispense_in_place(
            "pipette-id", volume=20, flow_rate=1, push_out=None, is_full_dispense=False
        )


async def test_aspirate_volume_validation(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    hardware_subject: HardwarePipettingHandler,
    mock_command_note_adder: CommandNoteAdder,
) -> None:
    """It should validate the input volume, possibly adjusting it for rounding error.

    This is done on both the VirtualPipettingHandler and HardwarePipettingHandler
    because they should behave the same way.
    """
    virtual_subject = VirtualPipettingHandler(state_view=mock_state_view)

    decoy.when(mock_state_view.pipettes.get_attached_tip("pipette-id")).then_return(
        TipGeometry(length=1, diameter=2, volume=3)
    )
    decoy.when(mock_state_view.pipettes.get_working_volume("pipette-id")).then_return(3)
    decoy.when(mock_state_view.pipettes.get_aspirated_volume("pipette-id")).then_return(
        2
    )

    # Stuff that only matters for the hardware subject:
    decoy.when(mock_hardware_api.attached_instruments).then_return({})
    decoy.when(
        mock_state_view.pipettes.get_hardware_pipette(
            pipette_id="pipette-id",
            attached_pipettes={},
        )
    ).then_return(
        HardwarePipette(
            mount=Mount.LEFT,
            config=cast(
                PipetteDict,
                {
                    "aspirate_flow_rate": 1.23,
                    "dispense_flow_rate": 4.56,
                    "blow_out_flow_rate": 7.89,
                },
            ),
        )
    )

    ok_volume = 1.0000000000001
    not_ok_volume = 1.01
    expected_adjusted_volume = 1

    for subject in [virtual_subject, hardware_subject]:
        assert (
            await subject.aspirate_in_place(
                pipette_id="pipette-id",
                volume=ok_volume,
                flow_rate=1,
                command_note_adder=mock_command_note_adder,
            )
            == expected_adjusted_volume
        )
        decoy.verify(
            mock_command_note_adder(
                cast(
                    CommandNote,
                    CommandNoteMatcher(
                        matching_noteKind_regex="warning",
                        matching_shortMessage_regex="Aspirate clamped to 1 µL",
                    ),
                )
            )
        )
        with pytest.raises(InvalidAspirateVolumeError):
            await subject.aspirate_in_place(
                pipette_id="pipette-id",
                volume=not_ok_volume,
                flow_rate=1,
                command_note_adder=mock_command_note_adder,
            )


async def test_dispense_volume_validation(
    decoy: Decoy,
    mock_state_view: StateView,
    mock_hardware_api: HardwareAPI,
    hardware_subject: HardwarePipettingHandler,
) -> None:
    """It should validate the input volume, possibly adjusting it for rounding error.

    This is done on both the VirtualPipettingHandler and HardwarePipettingHandler
    because they should behave the same way.
    """
    virtual_subject = VirtualPipettingHandler(state_view=mock_state_view)

    decoy.when(mock_state_view.pipettes.get_attached_tip("pipette-id")).then_return(
        TipGeometry(length=1, diameter=2, volume=3)
    )
    decoy.when(mock_state_view.pipettes.get_aspirated_volume("pipette-id")).then_return(
        1
    )

    # Stuff that only matters for the hardware subject:
    decoy.when(mock_hardware_api.attached_instruments).then_return({})
    decoy.when(
        mock_state_view.pipettes.get_hardware_pipette(
            pipette_id="pipette-id",
            attached_pipettes={},
        )
    ).then_return(
        HardwarePipette(
            mount=Mount.LEFT,
            config=cast(
                PipetteDict,
                {
                    "aspirate_flow_rate": 1.23,
                    "dispense_flow_rate": 4.56,
                    "blow_out_flow_rate": 7.89,
                },
            ),
        )
    )

    ok_volume = 1.0000000000001
    not_ok_volume = 1.01
    expected_adjusted_volume = 1

    for subject in [virtual_subject, hardware_subject]:
        assert (
            await subject.dispense_in_place(
                pipette_id="pipette-id",
                volume=ok_volume,
                flow_rate=5,
                push_out=7,
                is_full_dispense=True,
            )
            == expected_adjusted_volume
        )
        with pytest.raises(InvalidDispenseVolumeError):
            await subject.dispense_in_place(
                pipette_id="pipette-id",
                volume=not_ok_volume,
                flow_rate=5,
                push_out=7,
                is_full_dispense=True,
            )
