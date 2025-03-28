from unittest import mock
from copy import deepcopy
from typing import Any, Callable, Dict, List, Tuple
import typing
from opentrons.protocol_api.core.well import AbstractWellCore
from opentrons_shared_data.labware.types import LabwareDefinition2
from opentrons_shared_data.protocol.types import (
    BlowoutParams,
    DelayParams,
    FlowRateParams,
    JsonProtocolV3,
    MoveToSlotParams,
    PipetteAccessParams,
    PipetteAccessWithOffsetParams,
    StandardLiquidHandlingParams,
    TouchTipParams,
)
import pytest
from opentrons.types import Location, Point, MountType
from opentrons.protocols.parse import parse
from opentrons.protocol_api.core.legacy.deck import Deck
from opentrons.protocol_api import (
    ProtocolContext,
    InstrumentContext,
    labware,
    MAX_SUPPORTED_VERSION,
)
from opentrons.protocols.execution import execute
from opentrons.protocols.execution.execute_json_v3 import (
    _aspirate,
    _dispense,
    _delay,
    _drop_tip,
    _blowout,
    dispatch_json,
    _pick_up_tip,
    _touch_tip,
    _air_gap,
    _move_to_slot,
    load_labware_from_json_defs,
    _get_well,
    _set_flow_rate,
    _get_location_with_offset,
    load_pipettes_from_json,
)
from opentrons.protocol_api.core.core_map import LoadedCoreMap
from opentrons.protocol_api.core.legacy.legacy_labware_core import LegacyLabwareCore
from opentrons.protocol_api.core.legacy.legacy_well_core import LegacyWellCore
from opentrons.protocol_api.core.legacy.well_geometry import WellGeometry


def test_load_pipettes_from_json() -> None:
    def fake_pipette(name: str, mount: MountType) -> Tuple[str, MountType]:
        return (name, mount)

    ctx = mock.create_autospec(ProtocolContext)
    ctx.load_instrument = fake_pipette
    protocol: "JsonProtocolV3" = {
        "pipettes": {
            "aID": {"mount": "left", "name": "p10_single"},
            "bID": {"mount": "right", "name": "p50_single"},
        }
    }
    result = load_pipettes_from_json(ctx, protocol)
    assert result == {"aID": ("p10_single", "left"), "bID": ("p50_single", "right")}  # type: ignore[comparison-overlap]


def test_get_well(minimal_labware_def2: LabwareDefinition2) -> None:
    deck = Location(Point(0, 0, 0), "deck")
    mock_core = mock.create_autospec(AbstractWellCore)
    mock_map = mock.create_autospec(LoadedCoreMap)
    mock_pipette = mock.create_autospec(InstrumentContext)
    well_name = "A2"
    some_labware = labware.Labware(
        core=LegacyLabwareCore(minimal_labware_def2, deck),
        api_version=MAX_SUPPORTED_VERSION,
        protocol_core=mock_core,
        core_map=mock_map,
    )
    loaded_labware = {"someLabwareId": some_labware}
    params: PipetteAccessParams = {
        "labware": "someLabwareId",
        "well": well_name,
        "pipette": mock_pipette,
    }
    result = _get_well(loaded_labware, params)
    assert result == some_labware[well_name]


def test_set_flow_rate() -> None:
    pipette = mock.create_autospec(InstrumentContext)
    pipette.flow_rate.aspirate = 1
    pipette.flow_rate.dispense = 2
    pipette.flow_rate.blow_out = 3
    params: FlowRateParams = {"flowRate": 42}

    _set_flow_rate(pipette, params)
    assert pipette.flow_rate.aspirate == 42
    assert pipette.flow_rate.dispense == 42
    assert pipette.flow_rate.blow_out == 42


def test_load_labware_from_json_defs(
    ctx: ProtocolContext, get_labware_fixture: Callable[[str], Any]
) -> None:
    custom_trough_def = get_labware_fixture("fixture_12_trough")
    data: "JsonProtocolV3" = {
        "labwareDefinitions": {"someTroughDef": custom_trough_def},
        "labware": {
            "sourcePlateId": {
                "slot": "10",
                "definitionId": "someTroughDef",
                "displayName": "Source (Buffer)",
            },
            "destPlateId": {"slot": "11", "definitionId": "someTroughDef"},  # type: ignore[typeddict-item]
        },
    }
    loaded_labware = load_labware_from_json_defs(ctx, data)

    # objects in loaded_labware should be same objs as labware objs in the deck
    assert loaded_labware["sourcePlateId"] == ctx.loaded_labwares[10]
    # use the displayName from protocol's labware.labwareId.displayName
    assert "Source (Buffer)" in str(loaded_labware["sourcePlateId"])
    assert loaded_labware["destPlateId"] == ctx.loaded_labwares[11]
    # use the metadata.displayName from embedded def
    assert custom_trough_def["metadata"]["displayName"] in str(
        loaded_labware["destPlateId"]
    )


def test_get_location_with_offset(min_lw2: labware.Labware) -> None:
    loaded_labware = {"someLabwareId": min_lw2}
    mock_pipette = mock.create_autospec(InstrumentContext)
    params: PipetteAccessWithOffsetParams = {
        "offsetFromBottomMm": 3,
        "labware": "someLabwareId",
        "well": "A2",
        "pipette": mock_pipette,
    }
    result = _get_location_with_offset(loaded_labware, params)
    assert result == Location(Point(19, 28, 8), min_lw2["A2"])


def test_get_location_with_offset_fixed_trash(
    minimal_labware_def2: LabwareDefinition2,
) -> None:
    deck = Location(Point(0, 0, 0), "deck")
    mock_core = mock.create_autospec(AbstractWellCore)
    mock_map = mock.create_autospec(LoadedCoreMap)
    mock_pipette = mock.create_autospec(InstrumentContext)
    trash_labware_def = deepcopy(minimal_labware_def2)
    trash_labware_def["parameters"]["quirks"] = ["fixedTrash"]
    trash_labware = labware.Labware(
        core=LegacyLabwareCore(trash_labware_def, deck),
        api_version=MAX_SUPPORTED_VERSION,
        protocol_core=mock_core,
        core_map=mock_map,
    )

    loaded_labware = {"someLabwareId": trash_labware}
    params: PipetteAccessWithOffsetParams = {
        "offsetFromBottomMm": 3,
        "labware": "someLabwareId",
        "well": "A1",
        "pipette": mock_pipette,
    }

    result = _get_location_with_offset(loaded_labware, params)

    assert result == Location(Point(10, 28, 45), trash_labware["A1"])


@pytest.mark.parametrize(
    "params, expected",
    [
        ({"wait": True, "message": "m"}, [mock.call.pause(msg="m")]),
        ({"wait": 123, "message": "m"}, [mock.call.delay(seconds=123, msg="m")]),
    ],
)
def test_delay(params: DelayParams, expected: List[Any]) -> None:
    mock_context = mock.MagicMock()
    _delay(mock_context, params)

    assert mock_context.mock_calls == expected


def test_blowout() -> None:
    m = mock.MagicMock()
    m.pipette_mock = mock.create_autospec(InstrumentContext)
    m.mock_set_flow_rate = mock.MagicMock()
    mock_labware = mock.create_autospec(labware.Labware)

    params: BlowoutParams = {
        "pipette": "somePipetteId",
        "labware": "someLabwareId",
        "well": "someWell",
        "flowRate": 0,
        "offsetFromBottomMm": 0,
    }
    instruments = {"somePipetteId": m.pipette_mock}
    loaded_labware: Dict[str, labware.Labware] = {"someLabwareId": mock_labware}

    flow_rate_patch = "opentrons.protocols.execution.execute_json_v3._set_flow_rate"
    with mock.patch(flow_rate_patch, new=m.mock_set_flow_rate):
        _blowout(instruments, loaded_labware, params)

    assert m.mock_calls == [
        mock.call.mock_set_flow_rate(m.pipette_mock, params),
        mock.call.pipette_mock.blow_out(mock_labware.__getitem__()),
    ]


def test_pick_up_tip() -> None:
    pipette_mock = mock.create_autospec(InstrumentContext)
    mock_labware = mock.create_autospec(labware.Labware)
    params: PipetteAccessParams = {
        "pipette": "somePipetteId",
        "labware": "someLabwareId",
        "well": "someWell",
    }
    instruments = {"somePipetteId": pipette_mock}
    loaded_labware: Dict[str, labware.Labware] = {"someLabwareId": mock_labware}

    _pick_up_tip(instruments, loaded_labware, params)

    assert pipette_mock.mock_calls == [
        mock.call.pick_up_tip(mock_labware.__getitem__())
    ]


def test_drop_tip() -> None:
    pipette_mock = mock.create_autospec(InstrumentContext)
    mock_labware = mock.create_autospec(labware.Labware)

    params: PipetteAccessParams = {
        "pipette": "somePipetteId",
        "labware": "someLabwareId",
        "well": "someWell",
    }
    instruments = {"somePipetteId": pipette_mock}
    loaded_labware = {"someLabwareId": mock_labware}
    _drop_tip(instruments, loaded_labware, params)

    assert pipette_mock.mock_calls == [mock.call.drop_tip(mock_labware.__getitem__())]


def test_air_gap(minimal_labware_def2: LabwareDefinition2) -> None:
    m = mock.MagicMock()
    m.pipette_mock = mock.create_autospec(InstrumentContext)
    m.mock_set_flow_rate = mock.MagicMock()
    mock_core = mock.create_autospec(LegacyLabwareCore)
    mock_map = mock.create_autospec(LoadedCoreMap)

    deck = Location(Point(0, 0, 0), "deck")
    well_name = "A2"
    some_labware = labware.Labware(
        core=LegacyLabwareCore(minimal_labware_def2, deck),
        api_version=MAX_SUPPORTED_VERSION,
        protocol_core=mock_core,
        core_map=mock_map,
    )
    loaded_labware = {"someLabwareId": some_labware}
    # params = {"labware": "someLabwareId", "well": well_name}

    params: StandardLiquidHandlingParams = {
        "pipette": "somePipetteId",
        "volume": 42,
        "labware": "someLabwareId",
        "well": well_name,
        "offsetFromBottomMm": 12,
        "flowRate": 0,
    }

    instruments = {"somePipetteId": m.pipette_mock}

    loaded_labware = {"someLabwareId": some_labware}

    with mock.patch(
        "opentrons.protocols.execution.execute_json_v3._set_flow_rate",
        new=m.mock_set_flow_rate,
    ):
        _air_gap(instruments, loaded_labware, params)

    # NOTE: air_gap `height` arg is mm from well top,
    # so we expect it to equal offsetFromBottomMm - well depth.
    assert m.mock_calls == [
        mock.call.mock_set_flow_rate(m.pipette_mock, params),
        mock.call.pipette_mock.move_to(
            Location(point=Point(x=19, y=28, z=17.0), labware=some_labware[well_name])
        ),
        mock.call.pipette_mock.air_gap(42, 12 - 40),
    ]


def test_aspirate() -> None:
    m = mock.MagicMock()
    m.pipette_mock = mock.create_autospec(InstrumentContext)
    m.mock_get_location_with_offset = mock.MagicMock(
        return_value=mock.sentinel.location
    )
    m.mock_set_flow_rate = mock.MagicMock()

    params: StandardLiquidHandlingParams = {
        "pipette": "somePipetteId",
        "volume": 42,
        "labware": "someLabwareId",
        "well": "someWell",
        "flowRate": 0,
        "offsetFromBottomMm": 0,
    }
    instruments = {"somePipetteId": m.pipette_mock}

    with mock.patch(
        "opentrons.protocols.execution.execute_json_v3._get_location_with_offset",
        new=m.mock_get_location_with_offset,
    ):
        with mock.patch(
            "opentrons.protocols.execution.execute_json_v3._set_flow_rate",
            new=m.mock_set_flow_rate,
        ):
            _aspirate(instruments, mock.sentinel.loaded_labware, params)

    assert m.mock_calls == [
        mock.call.mock_get_location_with_offset(mock.sentinel.loaded_labware, params),
        mock.call.mock_set_flow_rate(m.pipette_mock, params),
        mock.call.pipette_mock.aspirate(42, mock.sentinel.location),
    ]


def test_dispense() -> None:
    m = mock.MagicMock()
    m.pipette_mock = mock.create_autospec(InstrumentContext)
    m.mock_get_location_with_offset = mock.MagicMock(
        return_value=mock.sentinel.location
    )
    m.mock_set_flow_rate = mock.MagicMock()

    params: StandardLiquidHandlingParams = {
        "pipette": "somePipetteId",
        "volume": 42,
        "labware": "someLabwareId",
        "well": "someWell",
        "flowRate": 0,
        "offsetFromBottomMm": 0,
    }
    instruments = {"somePipetteId": m.pipette_mock}

    with mock.patch(
        "opentrons.protocols.execution.execute_json_v3._get_location_with_offset",
        new=m.mock_get_location_with_offset,
    ):
        with mock.patch(
            "opentrons.protocols.execution.execute_json_v3._set_flow_rate",
            new=m.mock_set_flow_rate,
        ):
            _dispense(instruments, mock.sentinel.loaded_labware, params)

    assert m.mock_calls == [
        mock.call.mock_get_location_with_offset(mock.sentinel.loaded_labware, params),
        mock.call.mock_set_flow_rate(m.pipette_mock, params),
        mock.call.pipette_mock.dispense(42, mock.sentinel.location),
    ]


def test_touch_tip() -> None:
    location = Location(Point(1, 2, 3), "deck")
    mock_parent = mock.create_autospec(labware.Labware)
    mock_core = mock.create_autospec(LegacyLabwareCore)
    well = labware.Well(
        parent=mock_parent,
        core=LegacyWellCore(
            well_geometry=WellGeometry(
                {
                    "shape": "circular",
                    "depth": 40,
                    "totalLiquidVolume": 100,
                    "diameter": 30,
                    "x": 40,
                    "y": 50,
                    "z": 3,
                },
                parent_point=Point(10, 20, 30),
                parent_object=mock_core,
            ),
            display_name="some well",
            has_tip=False,
            name="A2",
        ),
        api_version=MAX_SUPPORTED_VERSION,
    )

    pipette_mock = mock.create_autospec(InstrumentContext, name="pipette_mock")
    mock_get_location_with_offset = mock.MagicMock(
        return_value=location, name="mock_get_location_with_offset"
    )
    mock_get_well = mock.MagicMock(return_value=well, name="mock_get_well")
    mock_set_flow_rate = mock.MagicMock(name="mock_set_flow_rate")

    params: TouchTipParams = {
        "pipette": "somePipetteId",
        "labware": "someLabwareId",
        "well": "someWell",
        "offsetFromBottomMm": 0,
    }
    instruments = {"somePipetteId": pipette_mock}

    with mock.patch(
        "opentrons.protocols.execution.execute_json_v3._get_location_with_offset",
        new=mock_get_location_with_offset,
    ):
        with mock.patch(
            "opentrons.protocols.execution.execute_json_v3._get_well", new=mock_get_well
        ):
            with mock.patch(
                "opentrons.protocols.execution.execute_json_v3._set_flow_rate",
                new=mock_set_flow_rate,
            ):
                _touch_tip(instruments, mock.sentinel.loaded_labware, params)

    # note: for this fn, order of calls doesn't matter b/c
    # we don't have stateful stuff like flow_rate
    mock_get_location_with_offset.assert_called_once_with(
        mock.sentinel.loaded_labware, params
    )
    mock_get_well.assert_called_once_with(mock.sentinel.loaded_labware, params)
    assert pipette_mock.mock_calls == [mock.call.touch_tip(well, v_offset=-70.0)]


def test_move_to_slot() -> None:
    slot_position = Location(Point(1, 2, 3), "deck")
    mock_context = mock.Mock()

    mock_deck = mock.MagicMock(spec=Deck)
    mock_deck.__contains__.return_value = True
    mock_deck.position_for.return_value = slot_position

    mock_context.deck = mock_deck
    pipette_mock = mock.create_autospec(InstrumentContext)

    instruments = {"somePipetteId": pipette_mock}

    params: MoveToSlotParams = {
        "pipette": "somePipetteId",
        "slot": "4",
        "offset": {"x": 10, "y": 11, "z": 12},
        "forceDirect": mock.sentinel.force_direct,
        "minimumZHeight": mock.sentinel.minimum_z_height,
    }

    _move_to_slot(mock_context, instruments, params)

    assert pipette_mock.mock_calls == [
        mock.call.move_to(
            Location(Point(11, 13, 15), "deck"),
            force_direct=mock.sentinel.force_direct,
            minimum_z_height=mock.sentinel.minimum_z_height,
        )
    ]


def test_dispatch_json() -> None:
    m = mock.MagicMock()
    mock_dispatcher_map = {
        "delay": m._delay,
        "blowout": m._blowout,
        "pickUpTip": m._pick_up_tip,
        "dropTip": m._drop_tip,
        "aspirate": m._aspirate,
        "dispense": m._dispense,
        "touchTip": m._touch_tip,
        "moveToSlot": m._move_to_slot,
    }

    with mock.patch(
        "opentrons.protocols.execution.execute_json_v3.dispatcher_map",
        new=mock_dispatcher_map,
    ):
        protocol_data = {
            "commands": [
                {"command": "delay", "params": "delay_params"},
                {"command": "blowout", "params": "blowout_params"},
                {"command": "pickUpTip", "params": "pickUpTip_params"},
                {"command": "dropTip", "params": "dropTip_params"},
                {"command": "aspirate", "params": "aspirate_params"},
                {"command": "dispense", "params": "dispense_params"},
                {"command": "touchTip", "params": "touchTip_params"},
                {"command": "moveToSlot", "params": "moveToSlot_params"},
            ]
        }
        context = mock.sentinel.context
        instruments = mock.sentinel.instruments
        loaded_labware = mock.sentinel.loaded_labware
        dispatch_json(context, protocol_data, instruments, loaded_labware)  # type: ignore[arg-type]

        assert m.mock_calls == [
            mock.call._delay(context, "delay_params"),
            mock.call._blowout(instruments, loaded_labware, "blowout_params"),
            mock.call._pick_up_tip(instruments, loaded_labware, "pickUpTip_params"),
            mock.call._drop_tip(instruments, loaded_labware, "dropTip_params"),
            mock.call._aspirate(instruments, loaded_labware, "aspirate_params"),
            mock.call._dispense(instruments, loaded_labware, "dispense_params"),
            mock.call._touch_tip(instruments, loaded_labware, "touchTip_params"),
            mock.call._move_to_slot(context, instruments, "moveToSlot_params"),
        ]


@typing.no_type_check
def test_dispatch_json_invalid_command() -> None:
    protocol_data = {
        "commands": [
            {"command": "no_such_command", "params": "foo"},
        ]
    }
    with pytest.raises(RuntimeError):
        dispatch_json(
            context=None,
            protocol_data=protocol_data,
            instruments=None,
            loaded_labware=None,
        )


@pytest.mark.ot2_only
def test_papi_execute_json_v3(
    monkeypatch: pytest.MonkeyPatch,
    ctx: ProtocolContext,
    get_json_protocol_fixture: Callable[[str, str, bool], str],
) -> None:
    protocol_data = get_json_protocol_fixture("3", "testAllAtomicSingleV3", False)
    protocol = parse(protocol_data, None)
    ctx.home()
    # Check that we end up executing the protocol ok
    execute.run_protocol(protocol, ctx)
