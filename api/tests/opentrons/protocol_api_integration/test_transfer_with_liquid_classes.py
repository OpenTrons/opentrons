"""Tests for the transfer APIs using liquid classes."""
import pytest
import mock

from opentrons.protocol_api import ProtocolContext
from opentrons.protocol_api.core.engine import InstrumentCore
from opentrons.protocol_api.core.engine.transfer_components_executor import (
    TransferType,
    LiquidAndAirGapPair,
)


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_water_transfer_with_volume_more_than_tip_max(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should run the transfer steps without any errors.

    This test only checks that various supported configurations for a transfer
    analyze successfully. It doesn't check whether the steps are as expected.
    That will be covered in analysis snapshot tests.
    """
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    pipette_1k = simulated_protocol_context.load_instrument(
        "flex_1channel_1000", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    with mock.patch.object(
        InstrumentCore,
        "pick_up_tip",
        side_effect=InstrumentCore.pick_up_tip,
        autospec=True,
    ) as patched_pick_up_tip:
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")

        pipette_1k.transfer_liquid(
            liquid_class=water,
            volume=60,
            source=nest_plate.rows()[0],
            dest=arma_plate.rows()[0],
            new_tip="always",
            trash_location=trash,
        )
        assert patched_pick_up_tip.call_count == 24
        patched_pick_up_tip.reset_mock()

        pipette_1k.transfer_liquid(
            liquid_class=water,
            volume=100,
            source=nest_plate.rows()[0],
            dest=arma_plate.rows()[0],
            new_tip="per source",
            trash_location=trash,
        )
        assert patched_pick_up_tip.call_count == 12
        patched_pick_up_tip.reset_mock()

        pipette_1k.pick_up_tip()
        pipette_1k.transfer_liquid(
            liquid_class=water,
            volume=50,
            source=nest_plate.rows()[0],
            dest=arma_plate.rows()[0],
            new_tip="never",
            trash_location=trash,
        )
        pipette_1k.drop_tip()
        assert patched_pick_up_tip.call_count == 1


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_order_of_water_transfer_steps(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should run the transfer steps without any errors.

    This test only checks that various supported configurations for a transfer
    analyze successfully. It doesn't check whether the steps are as expected.
    That will be covered in analysis snapshot tests.
    """
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    pipette_50 = simulated_protocol_context.load_instrument(
        "flex_1channel_50", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    with (
        mock.patch.object(
            InstrumentCore,
            "load_liquid_class",
            side_effect=InstrumentCore.load_liquid_class,
            autospec=True,
        ) as patched_load_liquid_class,
        mock.patch.object(
            InstrumentCore,
            "pick_up_tip",
            side_effect=InstrumentCore.pick_up_tip,
            autospec=True,
        ) as patched_pick_up_tip,
        mock.patch.object(
            InstrumentCore,
            "aspirate_liquid_class",
            side_effect=InstrumentCore.aspirate_liquid_class,
            autospec=True,
        ) as patched_aspirate,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class",
            side_effect=InstrumentCore.dispense_liquid_class,
            autospec=True,
        ) as patched_dispense,
        mock.patch.object(
            InstrumentCore,
            "drop_tip_in_disposal_location",
            side_effect=InstrumentCore.drop_tip_in_disposal_location,
            autospec=True,
        ) as patched_drop_tip,
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")
        mock_manager.attach_mock(patched_load_liquid_class, "load_liquid_class")
        mock_manager.attach_mock(patched_aspirate, "aspirate_liquid_class")
        mock_manager.attach_mock(patched_dispense, "dispense_liquid_class")
        mock_manager.attach_mock(patched_drop_tip, "drop_tip_in_disposal_location")
        pipette_50.transfer_liquid(
            liquid_class=water,
            volume=40,
            source=nest_plate.rows()[0][:2],
            dest=arma_plate.rows()[0][:2],
            new_tip="always",
            trash_location=trash,
        )
        expected_calls = [
            mock.call.load_liquid_class(
                mock.ANY,
                name="water",
                transfer_properties=mock.ANY,
                tiprack_uri="opentrons/opentrons_flex_96_tiprack_50ul/1",
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=40,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=40, air_gap=0.1)],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip_in_disposal_location(
                mock.ANY,
                disposal_location=trash,
                home_after=False,
                alternate_tip_drop=True,
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=40,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=40, air_gap=0.1)],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip_in_disposal_location(
                mock.ANY,
                disposal_location=trash,
                home_after=False,
                alternate_tip_drop=True,
            ),
        ]
        assert len(mock_manager.mock_calls) == 9
        assert mock_manager.mock_calls == expected_calls


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_order_of_water_transfer_steps_with_return_tip(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should run the transfer steps without any errors and return tips.

    This test only checks that various supported configurations for a transfer
    analyze successfully. It doesn't check whether the steps are as expected.
    That will be covered in analysis snapshot tests.
    """
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    pipette_50 = simulated_protocol_context.load_instrument(
        "flex_1channel_50", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    with (
        mock.patch.object(
            InstrumentCore,
            "load_liquid_class",
            side_effect=InstrumentCore.load_liquid_class,
            autospec=True,
        ) as patched_load_liquid_class,
        mock.patch.object(
            InstrumentCore,
            "pick_up_tip",
            side_effect=InstrumentCore.pick_up_tip,
            autospec=True,
        ) as patched_pick_up_tip,
        mock.patch.object(
            InstrumentCore,
            "aspirate_liquid_class",
            side_effect=InstrumentCore.aspirate_liquid_class,
            autospec=True,
        ) as patched_aspirate,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class",
            side_effect=InstrumentCore.dispense_liquid_class,
            autospec=True,
        ) as patched_dispense,
        mock.patch.object(
            InstrumentCore,
            "drop_tip",
            side_effect=InstrumentCore.drop_tip,
            autospec=True,
        ) as patched_drop_tip,
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")
        mock_manager.attach_mock(patched_load_liquid_class, "load_liquid_class")
        mock_manager.attach_mock(patched_aspirate, "aspirate_liquid_class")
        mock_manager.attach_mock(patched_dispense, "dispense_liquid_class")
        mock_manager.attach_mock(patched_drop_tip, "drop_tip")
        pipette_50.transfer_liquid(
            liquid_class=water,
            volume=40,
            source=nest_plate.rows()[0][:2],
            dest=arma_plate.rows()[0][:2],
            new_tip="always",
            trash_location=trash,
            return_tip=True,
        )
        expected_calls = [
            mock.call.load_liquid_class(
                mock.ANY,
                name="water",
                transfer_properties=mock.ANY,
                tiprack_uri="opentrons/opentrons_flex_96_tiprack_50ul/1",
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=40,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=40, air_gap=0.1)],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip(
                mock.ANY,
                location=None,
                well_core=mock.ANY,
                home_after=False,
                alternate_drop_location=False,
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=40,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=40, air_gap=0.1)],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip(
                mock.ANY,
                location=None,
                well_core=mock.ANY,
                home_after=False,
                alternate_drop_location=False,
            ),
        ]
        assert len(mock_manager.mock_calls) == 9
        assert mock_manager.mock_calls == expected_calls


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_order_of_water_transfer_steps_with_no_new_tips(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should run the transfer steps without any errors.

    This test only checks that various supported configurations for a transfer
    analyze successfully. It doesn't check whether the steps are as expected.
    That will be covered in analysis snapshot tests.
    """
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    pipette_50 = simulated_protocol_context.load_instrument(
        "flex_1channel_50", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    pipette_50.pick_up_tip()
    with (
        mock.patch.object(
            InstrumentCore,
            "load_liquid_class",
            side_effect=InstrumentCore.load_liquid_class,
            autospec=True,
        ) as patched_load_liquid_class,
        mock.patch.object(
            InstrumentCore,
            "pick_up_tip",
            side_effect=InstrumentCore.pick_up_tip,
            autospec=True,
        ) as patched_pick_up_tip,
        mock.patch.object(
            InstrumentCore,
            "aspirate_liquid_class",
            side_effect=InstrumentCore.aspirate_liquid_class,
            autospec=True,
        ) as patched_aspirate,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class",
            side_effect=InstrumentCore.dispense_liquid_class,
            autospec=True,
        ) as patched_dispense,
        mock.patch.object(
            InstrumentCore,
            "drop_tip_in_disposal_location",
            side_effect=InstrumentCore.drop_tip_in_disposal_location,
            autospec=True,
        ) as patched_drop_tip,
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")
        mock_manager.attach_mock(patched_load_liquid_class, "load_liquid_class")
        mock_manager.attach_mock(patched_aspirate, "aspirate_liquid_class")
        mock_manager.attach_mock(patched_dispense, "dispense_liquid_class")
        mock_manager.attach_mock(patched_drop_tip, "drop_tip_in_disposal_location")
        pipette_50.transfer_liquid(
            liquid_class=water,
            volume=40,
            source=nest_plate.rows()[0][:2],
            dest=arma_plate.rows()[0][:2],
            new_tip="never",
            trash_location=trash,
        )
        expected_calls = [
            mock.call.load_liquid_class(
                mock.ANY,
                name="water",
                transfer_properties=mock.ANY,
                tiprack_uri="opentrons/opentrons_flex_96_tiprack_50ul/1",
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=40,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=40, air_gap=0.1)],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=40,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0.1)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=40, air_gap=0.1)],
                add_final_air_gap=False,
                trash_location=mock.ANY,
            ),
        ]
        assert len(mock_manager.mock_calls) == len(expected_calls)
        assert mock_manager.mock_calls[2] == expected_calls[2]


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_order_of_water_consolidate_steps(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should run the consolidate steps without any errors.

    This test only checks that various supported configurations for a consolidation
    analyze successfully. It doesn't check whether the steps are as expected.
    That will be covered in analysis snapshot tests.
    """
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    pipette_50 = simulated_protocol_context.load_instrument(
        "flex_1channel_50", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    with (
        mock.patch.object(
            InstrumentCore,
            "load_liquid_class",
            side_effect=InstrumentCore.load_liquid_class,
            autospec=True,
        ) as patched_load_liquid_class,
        mock.patch.object(
            InstrumentCore,
            "pick_up_tip",
            side_effect=InstrumentCore.pick_up_tip,
            autospec=True,
        ) as patched_pick_up_tip,
        mock.patch.object(
            InstrumentCore,
            "aspirate_liquid_class",
            side_effect=InstrumentCore.aspirate_liquid_class,
            autospec=True,
        ) as patched_aspirate,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class",
            side_effect=InstrumentCore.dispense_liquid_class,
            autospec=True,
        ) as patched_dispense,
        mock.patch.object(
            InstrumentCore,
            "drop_tip_in_disposal_location",
            side_effect=InstrumentCore.drop_tip_in_disposal_location,
            autospec=True,
        ) as patched_drop_tip,
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")
        mock_manager.attach_mock(patched_load_liquid_class, "load_liquid_class")
        mock_manager.attach_mock(patched_aspirate, "aspirate_liquid_class")
        mock_manager.attach_mock(patched_dispense, "dispense_liquid_class")
        mock_manager.attach_mock(patched_drop_tip, "drop_tip_in_disposal_location")
        pipette_50.consolidate_liquid(
            liquid_class=water,
            volume=25,
            source=nest_plate.rows()[0][:2],
            dest=arma_plate.wells()[0],
            new_tip="once",
            trash_location=trash,
        )
        expected_calls = [
            mock.call.load_liquid_class(
                mock.ANY,
                name="water",
                transfer_properties=mock.ANY,
                tiprack_uri="opentrons/opentrons_flex_96_tiprack_50ul/1",
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=25,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=25,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=25, air_gap=0.1)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=50,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=50, air_gap=0)],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip_in_disposal_location(
                mock.ANY,
                disposal_location=trash,
                home_after=False,
                alternate_tip_drop=True,
            ),
        ]
        assert len(mock_manager.mock_calls) == 6
        assert mock_manager.mock_calls == expected_calls


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_order_of_water_consolidate_steps_larger_volume_then_tip(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should run the consolidate steps without any errors.

    This test only checks that various supported configurations for a consolidation
    analyze successfully. It doesn't check whether the steps are as expected.
    That will be covered in analysis snapshot tests.
    """
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    pipette_50 = simulated_protocol_context.load_instrument(
        "flex_1channel_50", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    with (
        mock.patch.object(
            InstrumentCore,
            "load_liquid_class",
            side_effect=InstrumentCore.load_liquid_class,
            autospec=True,
        ) as patched_load_liquid_class,
        mock.patch.object(
            InstrumentCore,
            "pick_up_tip",
            side_effect=InstrumentCore.pick_up_tip,
            autospec=True,
        ) as patched_pick_up_tip,
        mock.patch.object(
            InstrumentCore,
            "aspirate_liquid_class",
            side_effect=InstrumentCore.aspirate_liquid_class,
            autospec=True,
        ) as patched_aspirate,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class",
            side_effect=InstrumentCore.dispense_liquid_class,
            autospec=True,
        ) as patched_dispense,
        mock.patch.object(
            InstrumentCore,
            "drop_tip_in_disposal_location",
            side_effect=InstrumentCore.drop_tip_in_disposal_location,
            autospec=True,
        ) as patched_drop_tip,
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")
        mock_manager.attach_mock(patched_load_liquid_class, "load_liquid_class")
        mock_manager.attach_mock(patched_aspirate, "aspirate_liquid_class")
        mock_manager.attach_mock(patched_dispense, "dispense_liquid_class")
        mock_manager.attach_mock(patched_drop_tip, "drop_tip_in_disposal_location")
        pipette_50.consolidate_liquid(
            liquid_class=water,
            volume=30,
            source=nest_plate.rows()[0][:2],
            dest=arma_plate.wells()[0],
            new_tip="always",
            trash_location=trash,
        )
        expected_calls = [
            mock.call.load_liquid_class(
                mock.ANY,
                name="water",
                transfer_properties=mock.ANY,
                tiprack_uri="opentrons/opentrons_flex_96_tiprack_50ul/1",
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=30,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=30,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=30, air_gap=0.1)],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip_in_disposal_location(
                mock.ANY,
                disposal_location=trash,
                home_after=False,
                alternate_tip_drop=True,
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=30,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=30,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=30, air_gap=0.1)],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip_in_disposal_location(
                mock.ANY,
                disposal_location=trash,
                home_after=False,
                alternate_tip_drop=True,
            ),
        ]
        assert len(mock_manager.mock_calls) == 9
        assert mock_manager.mock_calls == expected_calls


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_order_of_water_consolidate_steps_with_no_new_tips(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should run the consolidate steps without any errors.

    This test only checks that various supported configurations for a consolidation
    analyze successfully. It doesn't check whether the steps are as expected.
    That will be covered in analysis snapshot tests.
    """
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    pipette_50 = simulated_protocol_context.load_instrument(
        "flex_1channel_50", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    pipette_50.pick_up_tip()
    with (
        mock.patch.object(
            InstrumentCore,
            "load_liquid_class",
            side_effect=InstrumentCore.load_liquid_class,
            autospec=True,
        ) as patched_load_liquid_class,
        mock.patch.object(
            InstrumentCore,
            "pick_up_tip",
            side_effect=InstrumentCore.pick_up_tip,
            autospec=True,
        ) as patched_pick_up_tip,
        mock.patch.object(
            InstrumentCore,
            "aspirate_liquid_class",
            side_effect=InstrumentCore.aspirate_liquid_class,
            autospec=True,
        ) as patched_aspirate,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class",
            side_effect=InstrumentCore.dispense_liquid_class,
            autospec=True,
        ) as patched_dispense,
        mock.patch.object(
            InstrumentCore,
            "drop_tip_in_disposal_location",
            side_effect=InstrumentCore.drop_tip_in_disposal_location,
            autospec=True,
        ) as patched_drop_tip,
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")
        mock_manager.attach_mock(patched_load_liquid_class, "load_liquid_class")
        mock_manager.attach_mock(patched_aspirate, "aspirate_liquid_class")
        mock_manager.attach_mock(patched_dispense, "dispense_liquid_class")
        mock_manager.attach_mock(patched_drop_tip, "drop_tip_in_disposal_location")
        pipette_50.consolidate_liquid(
            liquid_class=water,
            volume=25,
            source=nest_plate.rows()[0][:2],
            dest=arma_plate.wells()[0],
            new_tip="never",
            trash_location=trash,
        )
        expected_calls = [
            mock.call.load_liquid_class(
                mock.ANY,
                name="water",
                transfer_properties=mock.ANY,
                tiprack_uri="opentrons/opentrons_flex_96_tiprack_50ul/1",
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=25,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=25,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=25, air_gap=0.1)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=50,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=50, air_gap=0)],
                add_final_air_gap=False,
                trash_location=mock.ANY,
            ),
        ]
        assert len(mock_manager.mock_calls) == 4
        assert mock_manager.mock_calls == expected_calls


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_order_of_water_consolidate_steps_with_return_tip(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should run the consolidate steps without any errors and return tips.

    This test only checks that various supported configurations for a consolidation
    analyze successfully. It doesn't check whether the steps are as expected.
    That will be covered in analysis snapshot tests.
    """
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    pipette_50 = simulated_protocol_context.load_instrument(
        "flex_1channel_50", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    with (
        mock.patch.object(
            InstrumentCore,
            "load_liquid_class",
            side_effect=InstrumentCore.load_liquid_class,
            autospec=True,
        ) as patched_load_liquid_class,
        mock.patch.object(
            InstrumentCore,
            "pick_up_tip",
            side_effect=InstrumentCore.pick_up_tip,
            autospec=True,
        ) as patched_pick_up_tip,
        mock.patch.object(
            InstrumentCore,
            "aspirate_liquid_class",
            side_effect=InstrumentCore.aspirate_liquid_class,
            autospec=True,
        ) as patched_aspirate,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class",
            side_effect=InstrumentCore.dispense_liquid_class,
            autospec=True,
        ) as patched_dispense,
        mock.patch.object(
            InstrumentCore,
            "drop_tip",
            side_effect=InstrumentCore.drop_tip,
            autospec=True,
        ) as patched_drop_tip,
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")
        mock_manager.attach_mock(patched_load_liquid_class, "load_liquid_class")
        mock_manager.attach_mock(patched_aspirate, "aspirate_liquid_class")
        mock_manager.attach_mock(patched_dispense, "dispense_liquid_class")
        mock_manager.attach_mock(patched_drop_tip, "drop_tip")
        pipette_50.consolidate_liquid(
            liquid_class=water,
            volume=25,
            source=nest_plate.rows()[0][:2],
            dest=arma_plate.wells()[0],
            new_tip="once",
            trash_location=trash,
            return_tip=True,
        )
        expected_calls = [
            mock.call.load_liquid_class(
                mock.ANY,
                name="water",
                transfer_properties=mock.ANY,
                tiprack_uri="opentrons/opentrons_flex_96_tiprack_50ul/1",
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=25,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=25,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=25, air_gap=0.1)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=50,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.MANY_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=50, air_gap=0)],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip(
                mock.ANY,
                location=None,
                well_core=mock.ANY,
                home_after=False,
                alternate_drop_location=False,
            ),
        ]
        assert len(mock_manager.mock_calls) == 6
        assert mock_manager.mock_calls == expected_calls


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_water_distribution_with_volume_more_than_tip_max(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should execute the distribute steps with the expected tip pick ups."""
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_1000ul", "D1"
    )
    pipette_1k = simulated_protocol_context.load_instrument(
        "flex_1channel_1000", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    water_props = water.get_for(pipette_1k, tiprack)
    water_props.multi_dispense.retract.blowout.location = "destination"  # type: ignore[union-attr]
    water_props.multi_dispense.retract.blowout.flow_rate = pipette_1k.flow_rate.blow_out  # type: ignore[union-attr]
    water_props.multi_dispense.retract.blowout.enabled = True  # type: ignore[union-attr]
    with mock.patch.object(
        InstrumentCore,
        "pick_up_tip",
        side_effect=InstrumentCore.pick_up_tip,
        autospec=True,
    ) as patched_pick_up_tip:
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")

        pipette_1k.distribute_liquid(
            liquid_class=water,
            volume=60,
            source=nest_plate.rows()[0][0],
            dest=arma_plate.rows()[0],
            new_tip="always",
            trash_location=trash,
        )
        assert patched_pick_up_tip.call_count == 1
        patched_pick_up_tip.reset_mock()

        pipette_1k.distribute_liquid(
            liquid_class=water,
            volume=100,
            source=nest_plate.rows()[0][0],
            dest=arma_plate.rows()[0],
            new_tip="always",
            trash_location=trash,
        )
        assert patched_pick_up_tip.call_count == 2
        patched_pick_up_tip.reset_mock()

        pipette_1k.pick_up_tip()
        pipette_1k.distribute_liquid(
            liquid_class=water,
            volume=50,
            source=nest_plate.rows()[0][0],
            dest=arma_plate.rows()[0],
            new_tip="never",
            trash_location=trash,
        )
        pipette_1k.drop_tip()
        assert patched_pick_up_tip.call_count == 1


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_order_of_water_distribution_steps_using_multi_dispense(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should distribute the liquid using multi-dispense steps in the expected order."""
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_1000ul", "D1"
    )
    pipette_1k = simulated_protocol_context.load_instrument(
        "flex_1channel_1000", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    water_props = water.get_for(pipette_1k, tiprack)
    water_props.multi_dispense.retract.blowout.location = "destination"  # type: ignore[union-attr]
    water_props.multi_dispense.retract.blowout.flow_rate = pipette_1k.flow_rate.blow_out  # type: ignore[union-attr]
    water_props.multi_dispense.retract.blowout.enabled = True  # type: ignore[union-attr]

    expected_conditioning_volume = water_props.multi_dispense.conditioning_by_volume.get_for_volume(120)  # type: ignore[union-attr]
    expected_disposal_volume = water_props.multi_dispense.disposal_by_volume.get_for_volume(120)  # type: ignore[union-attr]

    with (
        mock.patch.object(
            InstrumentCore,
            "load_liquid_class",
            side_effect=InstrumentCore.load_liquid_class,
            autospec=True,
        ) as patched_load_liquid_class,
        mock.patch.object(
            InstrumentCore,
            "pick_up_tip",
            side_effect=InstrumentCore.pick_up_tip,
            autospec=True,
        ) as patched_pick_up_tip,
        mock.patch.object(
            InstrumentCore,
            "aspirate_liquid_class",
            side_effect=InstrumentCore.aspirate_liquid_class,
            autospec=True,
        ) as patched_aspirate,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class_during_multi_dispense",
            side_effect=InstrumentCore.dispense_liquid_class_during_multi_dispense,
            autospec=True,
        ) as patched_dispense,
        mock.patch.object(
            InstrumentCore,
            "drop_tip_in_disposal_location",
            side_effect=InstrumentCore.drop_tip_in_disposal_location,
            autospec=True,
        ) as patched_drop_tip,
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")
        mock_manager.attach_mock(patched_load_liquid_class, "load_liquid_class")
        mock_manager.attach_mock(patched_aspirate, "aspirate_liquid_class")
        mock_manager.attach_mock(
            patched_dispense, "dispense_liquid_class_during_multi_dispense"
        )
        mock_manager.attach_mock(patched_drop_tip, "drop_tip_in_disposal_location")
        pipette_1k.distribute_liquid(
            liquid_class=water,
            volume=40,
            source=nest_plate.rows()[0][1],
            dest=arma_plate.rows()[0][:3],
            new_tip="always",
            trash_location=trash,
        )
        expected_calls = [
            mock.call.load_liquid_class(
                mock.ANY,
                name="water",
                transfer_properties=mock.ANY,
                tiprack_uri="opentrons/opentrons_flex_96_tiprack_1000ul/1",
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=120 + expected_conditioning_volume + expected_disposal_volume,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_MANY,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
                conditioning_volume=expected_conditioning_volume,
            ),
            mock.call.dispense_liquid_class_during_multi_dispense(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_MANY,
                tip_contents=[
                    LiquidAndAirGapPair(
                        liquid=120 + expected_disposal_volume, air_gap=0
                    )
                ],
                add_final_air_gap=True,
                trash_location=mock.ANY,
                conditioning_volume=expected_conditioning_volume,
                disposal_volume=expected_disposal_volume,
            ),
            mock.call.dispense_liquid_class_during_multi_dispense(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_MANY,
                tip_contents=[
                    LiquidAndAirGapPair(liquid=80 + expected_disposal_volume, air_gap=0)
                ],
                add_final_air_gap=True,
                trash_location=mock.ANY,
                conditioning_volume=expected_conditioning_volume,
                disposal_volume=expected_disposal_volume,
            ),
            mock.call.dispense_liquid_class_during_multi_dispense(
                mock.ANY,
                volume=40,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_MANY,
                tip_contents=[
                    LiquidAndAirGapPair(liquid=40 + expected_disposal_volume, air_gap=0)
                ],
                add_final_air_gap=True,
                trash_location=mock.ANY,
                conditioning_volume=expected_conditioning_volume,
                disposal_volume=expected_disposal_volume,
            ),
            mock.call.drop_tip_in_disposal_location(
                mock.ANY,
                disposal_location=trash,
                home_after=False,
                alternate_tip_drop=True,
            ),
        ]
        assert mock_manager.mock_calls == expected_calls


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
@pytest.mark.parametrize(
    ["distribute_volume", "multi_dispense_props_present"],
    [
        (20, False),
        (26, True),
    ],  # Settings that should result in non-multi-dispense transfers
)
def test_order_of_water_distribute_steps_using_one_to_one_transfers(
    simulated_protocol_context: ProtocolContext,
    distribute_volume: float,
    multi_dispense_props_present: bool,
) -> None:
    """It should distribute liquid using the one-to-one transfer steps instead of doing multi-dispense."""
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_50ul", "D1"
    )
    pipette_50 = simulated_protocol_context.load_instrument(
        "flex_1channel_50", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )
    water = simulated_protocol_context.define_liquid_class("water")
    water_props = water.get_for(pipette_50, tiprack)
    if not multi_dispense_props_present:
        water_props._multi_dispense = None
    expected_post_aspirate_air_gap = (
        water_props.aspirate.retract.air_gap_by_volume.get_for_volume(distribute_volume)
    )
    with (
        mock.patch.object(
            InstrumentCore,
            "load_liquid_class",
            side_effect=InstrumentCore.load_liquid_class,
            autospec=True,
        ) as patched_load_liquid_class,
        mock.patch.object(
            InstrumentCore,
            "pick_up_tip",
            side_effect=InstrumentCore.pick_up_tip,
            autospec=True,
        ) as patched_pick_up_tip,
        mock.patch.object(
            InstrumentCore,
            "aspirate_liquid_class",
            side_effect=InstrumentCore.aspirate_liquid_class,
            autospec=True,
        ) as patched_aspirate,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class",
            side_effect=InstrumentCore.dispense_liquid_class,
            autospec=True,
        ) as patched_dispense,
        mock.patch.object(
            InstrumentCore,
            "drop_tip_in_disposal_location",
            side_effect=InstrumentCore.drop_tip_in_disposal_location,
            autospec=True,
        ) as patched_drop_tip,
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")
        mock_manager.attach_mock(patched_load_liquid_class, "load_liquid_class")
        mock_manager.attach_mock(patched_aspirate, "aspirate_liquid_class")
        mock_manager.attach_mock(patched_dispense, "dispense_liquid_class")
        mock_manager.attach_mock(patched_drop_tip, "drop_tip_in_disposal_location")
        pipette_50.distribute_liquid(
            liquid_class=water,
            volume=distribute_volume,
            source=nest_plate.rows()[0][2],
            dest=arma_plate.wells()[:2],
            new_tip="always",
            trash_location=trash,
        )
        expected_calls = [
            mock.call.load_liquid_class(
                mock.ANY,
                name="water",
                transfer_properties=mock.ANY,
                tiprack_uri="opentrons/opentrons_flex_96_tiprack_50ul/1",
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=distribute_volume,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=distribute_volume,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[
                    LiquidAndAirGapPair(
                        liquid=distribute_volume, air_gap=expected_post_aspirate_air_gap
                    )
                ],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip_in_disposal_location(
                mock.ANY,
                disposal_location=trash,
                home_after=False,
                alternate_tip_drop=True,
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=distribute_volume,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=distribute_volume,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_ONE,
                tip_contents=[
                    LiquidAndAirGapPair(
                        liquid=distribute_volume, air_gap=expected_post_aspirate_air_gap
                    )
                ],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip_in_disposal_location(
                mock.ANY,
                disposal_location=trash,
                home_after=False,
                alternate_tip_drop=True,
            ),
        ]
        assert len(mock_manager.mock_calls) == 9
        assert mock_manager.mock_calls == expected_calls


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_order_of_water_distribution_steps_using_mixed_dispense(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should distribute the liquid using multi-dispense and single-dispense steps in the expected order."""
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_1000ul", "D1"
    )
    pipette_1k = simulated_protocol_context.load_instrument(
        "flex_1channel_1000", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    arma_plate = simulated_protocol_context.load_labware(
        "armadillo_96_wellplate_200ul_pcr_full_skirt", "C2"
    )

    water = simulated_protocol_context.define_liquid_class("water")
    water_props = water.get_for(pipette_1k, tiprack)
    water_props.multi_dispense.retract.blowout.location = "destination"  # type: ignore[union-attr]
    water_props.multi_dispense.retract.blowout.flow_rate = pipette_1k.flow_rate.blow_out  # type: ignore[union-attr]
    water_props.multi_dispense.retract.blowout.enabled = True  # type: ignore[union-attr]
    expected_conditioning_volume = water_props.multi_dispense.conditioning_by_volume.get_for_volume(800)  # type: ignore[union-attr]
    expected_disposal_volume = water_props.multi_dispense.disposal_by_volume.get_for_volume(800)  # type: ignore[union-attr]
    expected_air_gap = water_props.aspirate.retract.air_gap_by_volume.get_for_volume(
        400
    )
    with (
        mock.patch.object(
            InstrumentCore,
            "load_liquid_class",
            side_effect=InstrumentCore.load_liquid_class,
            autospec=True,
        ) as patched_load_liquid_class,
        mock.patch.object(
            InstrumentCore,
            "pick_up_tip",
            side_effect=InstrumentCore.pick_up_tip,
            autospec=True,
        ) as patched_pick_up_tip,
        mock.patch.object(
            InstrumentCore,
            "aspirate_liquid_class",
            side_effect=InstrumentCore.aspirate_liquid_class,
            autospec=True,
        ) as patched_aspirate,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class",
            side_effect=InstrumentCore.dispense_liquid_class,
            autospec=True,
        ) as patched_single_dispense,
        mock.patch.object(
            InstrumentCore,
            "dispense_liquid_class_during_multi_dispense",
            side_effect=InstrumentCore.dispense_liquid_class_during_multi_dispense,
            autospec=True,
        ) as patched_multi_dispense,
        mock.patch.object(
            InstrumentCore,
            "drop_tip_in_disposal_location",
            side_effect=InstrumentCore.drop_tip_in_disposal_location,
            autospec=True,
        ) as patched_drop_tip,
    ):
        mock_manager = mock.Mock()
        mock_manager.attach_mock(patched_pick_up_tip, "pick_up_tip")
        mock_manager.attach_mock(patched_load_liquid_class, "load_liquid_class")
        mock_manager.attach_mock(patched_aspirate, "aspirate_liquid_class")
        mock_manager.attach_mock(patched_single_dispense, "dispense_liquid_class")
        mock_manager.attach_mock(
            patched_multi_dispense, "dispense_liquid_class_during_multi_dispense"
        )
        mock_manager.attach_mock(patched_drop_tip, "drop_tip_in_disposal_location")
        pipette_1k.distribute_liquid(
            liquid_class=water,
            volume=400,
            source=nest_plate.rows()[0][1],
            dest=arma_plate.rows()[0][:3],
            new_tip="always",
            trash_location=trash,
        )
        expected_calls = [
            mock.call.load_liquid_class(
                mock.ANY,
                name="water",
                transfer_properties=mock.ANY,
                tiprack_uri="opentrons/opentrons_flex_96_tiprack_1000ul/1",
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=800 + expected_conditioning_volume + expected_disposal_volume,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_MANY,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
                conditioning_volume=expected_conditioning_volume,
            ),
            mock.call.dispense_liquid_class_during_multi_dispense(
                mock.ANY,
                volume=400,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_MANY,
                tip_contents=[
                    LiquidAndAirGapPair(
                        liquid=800 + expected_disposal_volume, air_gap=0
                    )
                ],
                add_final_air_gap=True,
                trash_location=mock.ANY,
                conditioning_volume=expected_conditioning_volume,
                disposal_volume=expected_disposal_volume,
            ),
            mock.call.dispense_liquid_class_during_multi_dispense(
                mock.ANY,
                volume=400,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_MANY,
                tip_contents=[
                    LiquidAndAirGapPair(
                        liquid=400 + expected_disposal_volume, air_gap=0
                    )
                ],
                add_final_air_gap=True,
                trash_location=mock.ANY,
                conditioning_volume=expected_conditioning_volume,
                disposal_volume=expected_disposal_volume,
            ),
            mock.call.drop_tip_in_disposal_location(
                mock.ANY,
                disposal_location=trash,
                home_after=False,
                alternate_tip_drop=True,
            ),
            mock.call.pick_up_tip(
                mock.ANY,
                location=mock.ANY,
                well_core=mock.ANY,
                presses=mock.ANY,
                increment=mock.ANY,
            ),
            mock.call.aspirate_liquid_class(
                mock.ANY,
                volume=400,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_MANY,
                tip_contents=[LiquidAndAirGapPair(liquid=0, air_gap=0)],
                conditioning_volume=0,
            ),
            mock.call.dispense_liquid_class(
                mock.ANY,
                volume=400,
                dest=mock.ANY,
                source=mock.ANY,
                transfer_properties=mock.ANY,
                transfer_type=TransferType.ONE_TO_MANY,
                tip_contents=[
                    LiquidAndAirGapPair(
                        liquid=400,
                        air_gap=expected_air_gap,
                    )
                ],
                add_final_air_gap=True,
                trash_location=mock.ANY,
            ),
            mock.call.drop_tip_in_disposal_location(
                mock.ANY,
                disposal_location=trash,
                home_after=False,
                alternate_tip_drop=True,
            ),
        ]
        assert mock_manager.mock_calls == expected_calls


@pytest.mark.ot3_only
@pytest.mark.parametrize(
    "simulated_protocol_context", [("2.23", "Flex")], indirect=True
)
def test_water_distribution_raises_error_for_disposal_vol_without_blowout(
    simulated_protocol_context: ProtocolContext,
) -> None:
    """It should execute the distribute steps with the expected tip pick ups."""
    trash = simulated_protocol_context.load_trash_bin("A3")
    tiprack = simulated_protocol_context.load_labware(
        "opentrons_flex_96_tiprack_1000ul", "D1"
    )
    pipette_1k = simulated_protocol_context.load_instrument(
        "flex_1channel_1000", mount="left", tip_racks=[tiprack]
    )
    nest_plate = simulated_protocol_context.load_labware(
        "nest_96_wellplate_200ul_flat", "C3"
    )
    water = simulated_protocol_context.define_liquid_class("water")
    with pytest.raises(
        RuntimeError,
        match="Specify a blowout location and enable blowout when using a disposal volume",
    ):
        pipette_1k.distribute_liquid(
            liquid_class=water,
            volume=140,
            source=nest_plate.rows()[0][0],
            dest=nest_plate.rows()[1],
            new_tip="once",
            trash_location=trash,
        )
