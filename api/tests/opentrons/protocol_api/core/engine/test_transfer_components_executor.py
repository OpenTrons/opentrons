"""Tests for complex commands executor."""
import pytest
from decoy import Decoy
from opentrons_shared_data.liquid_classes.liquid_class_definition import (
    LiquidClassSchemaV1,
    PositionReference,
    Coordinate,
)

from opentrons.protocol_api._liquid import LiquidClass
from opentrons.protocol_api._liquid_properties import TransferProperties
from opentrons.protocol_api.core.engine.well import WellCore
from opentrons.protocol_api.core.engine.instrument import InstrumentCore
from opentrons.protocol_api.core.engine.transfer_components_executor import (
    TransferComponentsExecutor,
    absolute_point_from_position_reference_and_offset,
    TipState,
    TransferType,
    LiquidAndAirGapPair,
)
from opentrons.types import Location, Point


@pytest.fixture
def mock_instrument_core(decoy: Decoy) -> InstrumentCore:
    """Return a mocked out instrument core."""
    return decoy.mock(cls=InstrumentCore)


@pytest.fixture
def sample_transfer_props(
    maximal_liquid_class_def: LiquidClassSchemaV1,
) -> TransferProperties:
    """Return a mocked out liquid class fixture."""
    return LiquidClass.create(maximal_liquid_class_def).get_for(
        pipette="flex_1channel_50", tiprack="opentrons_flex_96_tiprack_50ul"
    )


""" Test aspirate properties:
"submerge": {
  "positionReference": "well-top",
  "offset": {"x": 1, "y": 2, "z": 3},
  "speed": 100,
  "delay": {"enable": true, "params": {"duration": 10.0}}},
"retract": {
  "positionReference": "well-top",
  "offset": {"x": 3, "y": 2, "z": 1},
  "speed": 50,
  "airGapByVolume": [[1.0, 0.1], [49.9, 0.1], [50.0, 0.0]],
  "touchTip": {"enable": true, "params": {"zOffset": -1, "mmToEdge": 0.5, "speed": 30}},
  "delay": {"enable": true, "params": {"duration": 20}}},
"positionReference": "well-bottom",
"offset": {"x": 10, "y": 20, "z": 30},
"flowRateByVolume": [[1.0, 35.0], [10.0, 24.0], [50.0, 35.0]],
"correctionByVolume": [[0.0, 0.0]],
"preWet": true,
"mix": {"enable": true, "params": {"repetitions": 1, "volume": 50}},
"delay": {"enable": true, "params": {"duration": 0.2}}
"""


def test_submerge(
    decoy: Decoy,
    mock_instrument_core: InstrumentCore,
    sample_transfer_props: TransferProperties,
) -> None:
    """Should perform the expected submerge steps."""
    source_well = decoy.mock(cls=WellCore)
    well_top_point = Point(1, 2, 3)
    well_bottom_point = Point(4, 5, 6)
    air_gap_removal_flow_rate = (
        sample_transfer_props.dispense.flow_rate_by_volume.get_for_volume(123)
    )

    subject = TransferComponentsExecutor(
        instrument_core=mock_instrument_core,
        transfer_properties=sample_transfer_props,
        target_location=Location(Point(), labware=None),
        target_well=source_well,
        tip_state=TipState(),
        transfer_type=TransferType.ONE_TO_ONE,
    )
    decoy.when(source_well.get_bottom(0)).then_return(well_bottom_point)
    decoy.when(source_well.get_top(0)).then_return(well_top_point)

    subject.submerge(submerge_properties=sample_transfer_props.aspirate.submerge)

    decoy.verify(
        mock_instrument_core.move_to(
            location=Location(Point(x=2, y=4, z=6), labware=None),
            well_core=source_well,
            force_direct=False,
            minimum_z_height=None,
            speed=None,
        ),
        mock_instrument_core.dispense(
            location=Location(Point(x=2, y=4, z=6), labware=None),
            well_core=None,
            volume=123,
            rate=1,
            flow_rate=air_gap_removal_flow_rate,
            in_place=True,
            is_meniscus=None,
            push_out=0,
        ),
        mock_instrument_core.delay(0.5),
        mock_instrument_core.move_to(
            location=Location(Point(), labware=None),
            well_core=source_well,
            force_direct=True,
            minimum_z_height=None,
            speed=100,
        ),
        mock_instrument_core.delay(10),
    )


def test_aspirate_and_wait(
    decoy: Decoy,
    mock_instrument_core: InstrumentCore,
    sample_transfer_props: TransferProperties,
) -> None:
    """It should execute an aspirate and a delay according to properties."""
    source_well = decoy.mock(cls=WellCore)
    aspirate_flow_rate = (
        sample_transfer_props.aspirate.flow_rate_by_volume.get_for_volume(10)
    )

    subject = TransferComponentsExecutor(
        instrument_core=mock_instrument_core,
        transfer_properties=sample_transfer_props,
        target_location=Location(Point(1, 2, 3), labware=None),
        target_well=source_well,
        tip_state=TipState(),
        transfer_type=TransferType.ONE_TO_ONE,
    )
    subject.aspirate_and_wait(volume=10)
    decoy.verify(
        mock_instrument_core.aspirate(
            location=Location(Point(1, 2, 3), labware=None),
            well_core=None,
            volume=10,
            rate=1,
            flow_rate=aspirate_flow_rate,
            in_place=True,
            is_meniscus=None,
        ),
        mock_instrument_core.delay(0.2),
    )


def test_aspirate_and_wait_skips_delay(
    decoy: Decoy,
    mock_instrument_core: InstrumentCore,
    sample_transfer_props: TransferProperties,
) -> None:
    """It should skip the wait after aspirate."""
    sample_transfer_props.aspirate.delay.enabled = False
    source_well = decoy.mock(cls=WellCore)

    subject = TransferComponentsExecutor(
        instrument_core=mock_instrument_core,
        transfer_properties=sample_transfer_props,
        target_location=Location(Point(1, 2, 3), labware=None),
        target_well=source_well,
        tip_state=TipState(),
        transfer_type=TransferType.ONE_TO_ONE,
    )
    subject.aspirate_and_wait(volume=10)
    decoy.verify(
        mock_instrument_core.delay(0.2),
        times=0,
    )


def test_dispense_and_wait(
    decoy: Decoy,
    mock_instrument_core: InstrumentCore,
    sample_transfer_props: TransferProperties,
) -> None:
    """It should execute a dispense and a delay according to properties."""
    source_well = decoy.mock(cls=WellCore)
    dispense_flow_rate = (
        sample_transfer_props.dispense.flow_rate_by_volume.get_for_volume(10)
    )

    subject = TransferComponentsExecutor(
        instrument_core=mock_instrument_core,
        transfer_properties=sample_transfer_props,
        target_location=Location(Point(1, 2, 3), labware=None),
        target_well=source_well,
        tip_state=TipState(),
        transfer_type=TransferType.ONE_TO_ONE,
    )
    subject.dispense_and_wait(volume=10, push_out_override=123)
    decoy.verify(
        mock_instrument_core.dispense(
            location=Location(Point(1, 2, 3), labware=None),
            well_core=None,
            volume=10,
            rate=1,
            flow_rate=dispense_flow_rate,
            in_place=True,
            push_out=123,
            is_meniscus=None,
        ),
        mock_instrument_core.delay(0.5),
    )


def test_dispense_and_wait_skips_delay(
    decoy: Decoy,
    mock_instrument_core: InstrumentCore,
    sample_transfer_props: TransferProperties,
) -> None:
    """It should skip the wait after dispense."""
    sample_transfer_props.dispense.delay.enabled = False
    source_well = decoy.mock(cls=WellCore)

    subject = TransferComponentsExecutor(
        instrument_core=mock_instrument_core,
        transfer_properties=sample_transfer_props,
        target_location=Location(Point(1, 2, 3), labware=None),
        target_well=source_well,
        tip_state=TipState(),
        transfer_type=TransferType.ONE_TO_ONE,
    )
    subject.dispense_and_wait(volume=10, push_out_override=123)
    decoy.verify(
        mock_instrument_core.delay(0.2),
        times=0,
    )


def test_mix(
    decoy: Decoy,
    mock_instrument_core: InstrumentCore,
    sample_transfer_props: TransferProperties,
) -> None:
    """It should execute mix steps."""
    source_well = decoy.mock(cls=WellCore)
    aspirate_flow_rate = (
        sample_transfer_props.aspirate.flow_rate_by_volume.get_for_volume(50)
    )
    dispense_flow_rate = (
        sample_transfer_props.dispense.flow_rate_by_volume.get_for_volume(50)
    )
    subject = TransferComponentsExecutor(
        instrument_core=mock_instrument_core,
        transfer_properties=sample_transfer_props,
        target_location=Location(Point(1, 2, 3), labware=None),
        target_well=source_well,
        tip_state=TipState(),
        transfer_type=TransferType.ONE_TO_ONE,
    )
    subject.mix(
        mix_properties=sample_transfer_props.aspirate.mix,
        last_dispense_push_out=True,
    )

    decoy.verify(
        mock_instrument_core.aspirate(
            location=Location(Point(1, 2, 3), labware=None),
            well_core=None,
            volume=50,
            rate=1,
            flow_rate=aspirate_flow_rate,
            in_place=True,
            is_meniscus=None,
        ),
        mock_instrument_core.delay(0.2),
        mock_instrument_core.dispense(
            location=Location(Point(1, 2, 3), labware=None),
            well_core=None,
            volume=50,
            rate=1,
            flow_rate=dispense_flow_rate,
            in_place=True,
            push_out=2.0,
            is_meniscus=None,
        ),
        mock_instrument_core.delay(0.5),
    )


def test_mix_disabled(
    decoy: Decoy,
    mock_instrument_core: InstrumentCore,
    sample_transfer_props: TransferProperties,
) -> None:
    """It should not perform a mix when it is disabled."""
    sample_transfer_props.aspirate.mix.enabled = False
    source_well = decoy.mock(cls=WellCore)
    aspirate_flow_rate = (
        sample_transfer_props.aspirate.flow_rate_by_volume.get_for_volume(50)
    )
    subject = TransferComponentsExecutor(
        instrument_core=mock_instrument_core,
        transfer_properties=sample_transfer_props,
        target_location=Location(Point(1, 2, 3), labware=None),
        target_well=source_well,
        tip_state=TipState(),
        transfer_type=TransferType.ONE_TO_ONE,
    )
    subject.mix(
        mix_properties=sample_transfer_props.aspirate.mix,
        last_dispense_push_out=True,
    )
    decoy.verify(
        mock_instrument_core.aspirate(
            location=Location(Point(1, 2, 3), labware=None),
            well_core=None,
            volume=50,
            rate=1,
            flow_rate=aspirate_flow_rate,
            in_place=True,
            is_meniscus=None,
        ),
        times=0,
    )


def test_pre_wet(
    decoy: Decoy,
    mock_instrument_core: InstrumentCore,
    sample_transfer_props: TransferProperties,
) -> None:
    """It should execute pre-wet steps."""
    source_well = decoy.mock(cls=WellCore)
    aspirate_flow_rate = (
        sample_transfer_props.aspirate.flow_rate_by_volume.get_for_volume(40)
    )
    dispense_flow_rate = (
        sample_transfer_props.dispense.flow_rate_by_volume.get_for_volume(40)
    )
    subject = TransferComponentsExecutor(
        instrument_core=mock_instrument_core,
        transfer_properties=sample_transfer_props,
        target_location=Location(Point(1, 2, 3), labware=None),
        target_well=source_well,
        tip_state=TipState(),
        transfer_type=TransferType.ONE_TO_ONE,
    )
    subject.pre_wet(volume=40)

    decoy.verify(
        mock_instrument_core.aspirate(
            location=Location(Point(1, 2, 3), labware=None),
            well_core=None,
            volume=40,
            rate=1,
            flow_rate=aspirate_flow_rate,
            in_place=True,
            is_meniscus=None,
        ),
        mock_instrument_core.delay(0.2),
        mock_instrument_core.dispense(
            location=Location(Point(1, 2, 3), labware=None),
            well_core=None,
            volume=40,
            rate=1,
            flow_rate=dispense_flow_rate,
            in_place=True,
            push_out=0,
            is_meniscus=None,
        ),
        mock_instrument_core.delay(0.5),
    )


def test_pre_wet_disabled(
    decoy: Decoy,
    mock_instrument_core: InstrumentCore,
    sample_transfer_props: TransferProperties,
) -> None:
    """It should NOT execute pre-wet steps."""
    source_well = decoy.mock(cls=WellCore)
    sample_transfer_props.aspirate.pre_wet = False
    aspirate_flow_rate = (
        sample_transfer_props.aspirate.flow_rate_by_volume.get_for_volume(40)
    )
    subject = TransferComponentsExecutor(
        instrument_core=mock_instrument_core,
        transfer_properties=sample_transfer_props,
        target_location=Location(Point(1, 2, 3), labware=None),
        target_well=source_well,
        tip_state=TipState(),
        transfer_type=TransferType.ONE_TO_ONE,
    )
    subject.pre_wet(volume=40)

    decoy.verify(
        mock_instrument_core.aspirate(
            location=Location(Point(1, 2, 3), labware=None),
            well_core=None,
            volume=40,
            rate=1,
            flow_rate=aspirate_flow_rate,
            in_place=True,
            is_meniscus=None,
        ),
        times=0,
    )


def test_retract_after_aspiration(
    decoy: Decoy,
    mock_instrument_core: InstrumentCore,
    sample_transfer_props: TransferProperties,
) -> None:
    """It should execute steps to retract from well after an aspiration."""
    source_well = decoy.mock(cls=WellCore)
    well_top_point = Point(1, 2, 3)
    well_bottom_point = Point(4, 5, 6)

    air_gap_volume = (
        sample_transfer_props.aspirate.retract.air_gap_by_volume.get_for_volume(40)
    )

    subject = TransferComponentsExecutor(
        instrument_core=mock_instrument_core,
        transfer_properties=sample_transfer_props,
        target_location=Location(Point(1, 1, 1), labware=None),
        target_well=source_well,
        tip_state=TipState(),
        transfer_type=TransferType.ONE_TO_ONE,
    )
    decoy.when(source_well.get_bottom(0)).then_return(well_bottom_point)
    decoy.when(source_well.get_top(0)).then_return(well_top_point)

    subject.retract_after_aspiration(volume=40)

    decoy.verify(
        mock_instrument_core.move_to(
            location=Location(Point(x=4, y=4, z=4), labware=None),
            well_core=source_well,
            force_direct=True,
            minimum_z_height=None,
            speed=50,
        ),
        mock_instrument_core.delay(20),
        mock_instrument_core.touch_tip(
            location=Location(Point(x=4, y=4, z=4), labware=None),
            well_core=source_well,
            radius=0,  # Update this to use mmToEdge once implemented
            z_offset=-1,
            speed=30,
        ),
        mock_instrument_core.move_to(
            location=Location(Point(x=4, y=4, z=4), labware=None),
            well_core=source_well,
            force_direct=True,
            minimum_z_height=None,
            speed=None,
        ),
        mock_instrument_core.air_gap_in_place(
            volume=air_gap_volume,
            flow_rate=air_gap_volume,
        ),
        mock_instrument_core.delay(0.2),
    )


def test_retract_after_aspiration_without_touch_tip_and_delay(
    decoy: Decoy,
    mock_instrument_core: InstrumentCore,
    sample_transfer_props: TransferProperties,
) -> None:
    """It should execute steps to retract from well after an aspiration without a touch tip or delay."""
    source_well = decoy.mock(cls=WellCore)
    well_top_point = Point(1, 2, 3)
    well_bottom_point = Point(4, 5, 6)

    sample_transfer_props.aspirate.retract.touch_tip.enabled = False
    sample_transfer_props.aspirate.retract.delay.enabled = False

    air_gap_volume = (
        sample_transfer_props.aspirate.retract.air_gap_by_volume.get_for_volume(40)
    )

    subject = TransferComponentsExecutor(
        instrument_core=mock_instrument_core,
        transfer_properties=sample_transfer_props,
        target_location=Location(Point(1, 1, 1), labware=None),
        target_well=source_well,
        tip_state=TipState(),
        transfer_type=TransferType.ONE_TO_ONE,
    )
    decoy.when(source_well.get_bottom(0)).then_return(well_bottom_point)
    decoy.when(source_well.get_top(0)).then_return(well_top_point)

    subject.retract_after_aspiration(volume=40)

    decoy.verify(
        mock_instrument_core.move_to(
            location=Location(Point(x=4, y=4, z=4), labware=None),
            well_core=source_well,
            force_direct=True,
            minimum_z_height=None,
            speed=50,
        ),
        mock_instrument_core.air_gap_in_place(
            volume=air_gap_volume,
            flow_rate=air_gap_volume,
        ),
        mock_instrument_core.delay(0.2),
    )


@pytest.mark.parametrize(
    argnames=["position_reference", "offset", "expected_result"],
    argvalues=[
        (PositionReference.WELL_TOP, Coordinate(x=11, y=12, z=13), Point(12, 14, 16)),
        (
            PositionReference.WELL_BOTTOM,
            Coordinate(x=21, y=22, z=23),
            Point(25, 27, 29),
        ),
        (
            PositionReference.WELL_CENTER,
            Coordinate(x=31, y=32, z=33),
            Point(38, 40, 42),
        ),
    ],
)
def test_absolute_point_from_position_reference_and_offset(
    decoy: Decoy,
    position_reference: PositionReference,
    offset: Coordinate,
    expected_result: Point,
) -> None:
    """It should return the correct absolute point based on well, position reference and offset."""
    well = decoy.mock(cls=WellCore)

    well_top_point = Point(1, 2, 3)
    well_bottom_point = Point(4, 5, 6)
    well_center_point = Point(7, 8, 9)
    decoy.when(well.get_bottom(0)).then_return(well_bottom_point)
    decoy.when(well.get_top(0)).then_return(well_top_point)
    decoy.when(well.get_center()).then_return(well_center_point)

    assert (
        absolute_point_from_position_reference_and_offset(
            well=well, position_reference=position_reference, offset=offset
        )
        == expected_result
    )


def test_absolute_point_from_position_reference_and_offset_raises_errors(
    decoy: Decoy,
) -> None:
    """It should raise errors for invalid input."""
    well = decoy.mock(cls=WellCore)
    with pytest.raises(NotImplementedError):
        absolute_point_from_position_reference_and_offset(
            well=well,
            position_reference=PositionReference.LIQUID_MENISCUS,
            offset=Coordinate(x=0, y=0, z=0),
        )

    with pytest.raises(ValueError, match="Unknown position reference"):
        absolute_point_from_position_reference_and_offset(
            well=well,
            position_reference="PositionReference",  # type: ignore[arg-type]
            offset=Coordinate(x=0, y=0, z=0),
        )
