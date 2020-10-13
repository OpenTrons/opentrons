""" Test the InstrumentContext class and its functions """
import pytest
from unittest import mock
import opentrons.protocol_api as papi
from opentrons.protocols.advanced_control import transfers
from opentrons.types import Mount
from opentrons.protocols.types import APIVersion


@pytest.fixture
def make_context_and_labware():
    def _make_context_and_labware(api_version):
        ctx = papi.ProtocolContext(api_version=api_version)
        lw1 = ctx.load_labware('biorad_96_wellplate_200ul_pcr', 1)
        instr = ctx.load_instrument('p300_single', Mount.RIGHT)

        return {'ctx': ctx, 'instr': instr, 'lw1': lw1}

    return _make_context_and_labware


def test_blowout_location_unsupported_version(make_context_and_labware):
    # not supported in versions below 2.8
    context_and_labware = make_context_and_labware(APIVersion(2, 7))
    context_and_labware['ctx'].home()
    lw1 = context_and_labware['lw1']
    instr = context_and_labware['instr']
    with pytest.raises(
            ValueError,
            match='Cannot specify blowout location when using api version ' +
            'below 2.8, current version is 2.7'):
        instr.transfer(
            100,
            lw1['A1'],
            lw1['A2'],
            blowout_location='foo nonsense')


def test_blowout_location_invalid(make_context_and_labware):
    context_and_labware = make_context_and_labware(APIVersion(2, 8))
    context_and_labware['ctx'].home()
    lw1 = context_and_labware['lw1']
    instr = context_and_labware['instr']
    with pytest.raises(ValueError, match='blowout location should be either'):
        instr.transfer(
            100,
            lw1['A1'],
            lw1['A2'],
            blowout_location='foo nonsense')


def test_source_blowout_location_invalid_for_consolidate(
        make_context_and_labware):
    context_and_labware = make_context_and_labware(APIVersion(2, 8))
    context_and_labware['ctx'].home()
    lw1 = context_and_labware['lw1']
    instr = context_and_labware['instr']
    with pytest.raises(ValueError, match='blowout location for ' +
                       'consolidate cannot be'):
        instr.consolidate(
            100,
            [lw1['A1'], lw1['B1']],
            lw1['A2'],
            blow_out=True,
            blowout_location='source well')


def test_dest_blowout_location_invalid_for_distribute(
        make_context_and_labware):
    context_and_labware = make_context_and_labware(APIVersion(2, 8))
    context_and_labware['ctx'].home()
    lw1 = context_and_labware['lw1']
    instr = context_and_labware['instr']
    with pytest.raises(ValueError, match='blowout location for ' +
                       'distribute cannot be'):
        instr.distribute(
            100,
            lw1['A2'],
            [lw1['A1'], lw1['B1']],
            blow_out=True,
            blowout_location='destination well')


def test_valid_transfer_blowout_location(make_context_and_labware):
    context_and_labware = make_context_and_labware(APIVersion(2, 8))
    context_and_labware['ctx'].home()
    lw1 = context_and_labware['lw1']
    instr = context_and_labware['instr']

    with mock.patch.object(
            papi.InstrumentContext, '_execute_transfer') as patch:
        instr.transfer(
            100,
            lw1['A2'],
            [lw1['A1'], lw1['B1']],
            blow_out=True,
            blowout_location='destination well',
            new_tip='never'
        )
        blowout_strat_1 = patch.call_args_list[0][0][0]._options.transfer \
            .blow_out_strategy

        assert blowout_strat_1 == transfers.BlowOutStrategy.DEST

        instr.transfer(
            100,
            lw1['A2'],
            [lw1['A1'], lw1['B1']],
            blow_out=True,
            blowout_location='source well',
            new_tip='never'
        )
        blowout_strat_2 = patch.call_args_list[1][0][0]._options.transfer \
            .blow_out_strategy

        assert blowout_strat_2 == transfers.BlowOutStrategy.SOURCE

        instr.transfer(
            100,
            lw1['A2'],
            [lw1['A1'], lw1['B1']],
            blow_out=True,
            blowout_location='trash',
            new_tip='never'
        )
        blowout_strat_3 = patch.call_args_list[2][0][0]._options.transfer \
            .blow_out_strategy

        assert blowout_strat_3 == transfers.BlowOutStrategy.TRASH


def test_valid_consolidate_blowout_location(make_context_and_labware):
    context_and_labware = make_context_and_labware(APIVersion(2, 8))
    context_and_labware['ctx'].home()
    lw1 = context_and_labware['lw1']
    instr = context_and_labware['instr']

    with mock.patch.object(
            papi.InstrumentContext, '_execute_transfer') as patch:
        instr.consolidate(
            100,
            lw1['A2'],
            [lw1['A1'], lw1['B1']],
            blow_out=True,
            blowout_location='destination well',
            new_tip='never'
        )
        blowout_strat_1 = patch.call_args_list[0][0][0]._options.transfer \
            .blow_out_strategy

        assert blowout_strat_1 == transfers.BlowOutStrategy.DEST

        instr.consolidate(
            100,
            lw1['A2'],
            [lw1['A1'], lw1['B1']],
            blow_out=True,
            blowout_location='trash',
            new_tip='never'
        )
        blowout_strat_2 = patch.call_args_list[1][0][0]._options.transfer \
            .blow_out_strategy

        assert blowout_strat_2 == transfers.BlowOutStrategy.TRASH


def test_valid_distribute_blowout_location(make_context_and_labware):
    context_and_labware = make_context_and_labware(APIVersion(2, 8))
    context_and_labware['ctx'].home()
    lw1 = context_and_labware['lw1']
    instr = context_and_labware['instr']

    with mock.patch.object(
            papi.InstrumentContext, '_execute_transfer') as patch:
        instr.distribute(
            100,
            lw1['A2'],
            [lw1['A1'], lw1['B1']],
            blow_out=True,
            blowout_location='source well',
            new_tip='never'
        )
        blowout_strat_1 = patch.call_args_list[0][0][0]._options.transfer \
            .blow_out_strategy
        assert blowout_strat_1 == transfers.BlowOutStrategy.SOURCE

        instr.distribute(
            100,
            lw1['A2'],
            [lw1['A1'], lw1['B1']],
            blow_out=True,
            blowout_location='trash',
            new_tip='never'
        )

        blowout_strat_2 = patch.call_args_list[1][0][0]._options.transfer \
            .blow_out_strategy
        assert blowout_strat_2 == transfers.BlowOutStrategy.TRASH
