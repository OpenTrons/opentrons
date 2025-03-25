import { describe, it, expect } from 'vitest'
import { quickTransferStepCommands } from '../../utils/pythonCommands'
import {
  ConsolidateArgs,
  DistributeArgs,
  TransferArgs,
} from '@opentrons/step-generation'
import {
  fixture96Plate,
  fixtureP1000SingleV2Specs,
  fixtureTiprack1000ul,
} from '@opentrons/shared-data'
import type {
  InvariantContext,
  TimelineFrame,
} from '@opentrons/step-generation'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

const mockInvariantContext: InvariantContext = {
  moduleEntities: {},
  liquidEntities: {},
  additionalEquipmentEntities: {
    mockTrashBin: {
      name: 'trashBin',
      id: 'mockTrashBin',
      location: 'cutoutA3',
      pythonName: 'mock_trash_bin_1',
    },
  },
  pipetteEntities: {
    mockPipette: {
      name: 'p1000_single_flex',
      id: 'mockPipette',
      tiprackLabwareDef: [fixtureTiprack1000ul] as LabwareDefinition2[],
      tiprackDefURI: ['fixture/fixture_flex_96_tiprack_1000ul/1'],
      spec: fixtureP1000SingleV2Specs,
      pythonName: 'pipette',
    },
  },
  labwareEntities: {
    mockSourceLabware: {
      id: 'mockSourceLabware',
      labwareDefURI: 'mockDefUri',
      def: fixture96Plate as LabwareDefinition2,
      pythonName: 'mock_labware_1',
    },
    mockDestLabware: {
      id: 'mockDestLabware',
      labwareDefURI: 'mockDefUri',
      def: fixture96Plate as LabwareDefinition2,
      pythonName: 'mock_labware_2',
    },
    mockTiprack: {
      id: 'mockTiprack',
      labwareDefURI: 'fixture/fixture_flex_96_tiprack_1000ul/1',
      def: fixtureTiprack1000ul as LabwareDefinition2,
      pythonName: 'mock_tiprack_1',
    },
  },
  config: {} as any,
}
const mockRobotState: TimelineFrame = {
  pipettes: {
    mockPipette: {
      mount: 'left',
    },
  },
  labware: {
    mockSourceLabware: {
      slot: 'A1',
    },
    mockDestLabware: {
      slot: 'C2',
    },
    mockTiprack: {
      slot: 'B1',
    },
  },
  modules: {},
  tipState: {
    tipracks: {
      mockTiprack: {
        A1: true,
        B1: true,
      },
    },
    pipettes: {
      mockPipette: false,
    },
  },
  liquidState: {
    pipettes: {
      mockPipette: {
        0: {},
      },
    },
    labware: {
      mockSourceLabware: {
        A1: {},
      },
      mockDestLabware: {
        A1: {},
      },
    },
    additionalEquipment: {
      mockTrashBin: {},
    },
  },
}

describe('quickTransferStepCommands', () => {
  it('should generate a transfer step in py', () => {
    const mockStepArgs: TransferArgs = {
      commandCreatorFnName: 'transfer',
      sourceWells: ['A1'],
      destWells: ['B1'],
      blowoutFlowRateUlSec: 50,
      blowoutOffsetFromTopMm: -1,
      blowoutLocation: 'source',
      mixBeforeAspirate: null,
      mixInDestination: null,
      tipRack: 'fixture/fixture_flex_96_tiprack_1000ul/1',
      pipette: 'mockPipette',
      nozzles: null,
      sourceLabware: 'mockSourceLabware',
      destLabware: 'mockDestLabware',
      volume: 10,
      dropTipLocation: 'mockTrashBin',
      preWetTip: false,
      touchTipAfterAspirate: false,
      touchTipAfterAspirateOffsetMmFromTop: 0,
      touchTipAfterAspirateSpeed: null,
      changeTip: 'always',
      aspirateDelay: null,
      aspirateAirGapVolume: null,
      aspirateFlowRateUlSec: 56,
      aspirateOffsetFromBottomMm: -1,
      aspirateXOffset: 0,
      aspirateYOffset: 0,
      dispenseAirGapVolume: null,
      dispenseDelay: null,
      touchTipAfterDispense: false,
      touchTipAfterDispenseOffsetMmFromTop: 0,
      touchTipAfterDispenseSpeed: null,
      dispenseFlowRateUlSec: 80,
      dispenseOffsetFromBottomMm: -1,
      dispenseXOffset: 0,
      dispenseYOffset: 0,
      name: 'transfer',
      description: 'transferring from 1 well to another',
    }
    expect(
      quickTransferStepCommands({
        stepArgs: mockStepArgs,
        invariantContext: mockInvariantContext,
        initialRobotState: mockRobotState,
      })
    ).toBe(
      `
# TRANSFER STEP

pipette.pick_up_tip(location=mock_tiprack_1)
pipette.aspirate(
    volume=10,
    location=mock_labware_1["A1"].bottom(z=-1),
    rate=56 / pipette.flow_rate.aspirate,
)
pipette.dispense(
    volume=10,
    location=mock_labware_2["B1"].bottom(z=-1),
    rate=80 / pipette.flow_rate.dispense,
)
pipette.flow_rate.blow_out = 50
pipette.blow_out(mock_trash_bin_1)
pipette.drop_tip()`.trimStart()
    )
  })
  it('should generate a consolidate step in py', () => {
    const mockStepArgs: ConsolidateArgs = {
      commandCreatorFnName: 'consolidate',
      sourceWells: ['A1', 'B1'],
      destWell: 'B1',
      blowoutFlowRateUlSec: 50,
      blowoutOffsetFromTopMm: -1,
      blowoutLocation: 'source',
      mixFirstAspirate: null,
      mixInDestination: null,
      tipRack: 'fixture/fixture_flex_96_tiprack_1000ul/1',
      pipette: 'mockPipette',
      nozzles: null,
      sourceLabware: 'mockSourceLabware',
      destLabware: 'mockDestLabware',
      volume: 10,
      dropTipLocation: 'mockTrashBin',
      preWetTip: false,
      touchTipAfterAspirate: false,
      touchTipAfterAspirateOffsetMmFromTop: 0,
      touchTipAfterAspirateSpeed: null,
      changeTip: 'always',
      aspirateDelay: null,
      aspirateAirGapVolume: null,
      aspirateFlowRateUlSec: 56,
      aspirateOffsetFromBottomMm: -1,
      aspirateXOffset: 0,
      aspirateYOffset: 0,
      dispenseAirGapVolume: null,
      dispenseDelay: null,
      touchTipAfterDispense: false,
      touchTipAfterDispenseOffsetMmFromTop: 0,
      touchTipAfterDispenseSpeed: null,
      dispenseFlowRateUlSec: 80,
      dispenseOffsetFromBottomMm: -1,
      dispenseXOffset: 0,
      dispenseYOffset: 0,
      name: 'transfer',
      description: 'transferring from 1 well to another',
    }
    expect(
      quickTransferStepCommands({
        stepArgs: mockStepArgs,
        invariantContext: mockInvariantContext,
        initialRobotState: mockRobotState,
      })
    ).toBe(
      `
# CONSOLIDATE STEP

pipette.pick_up_tip(location=mock_tiprack_1)
pipette.aspirate(
    volume=10,
    location=mock_labware_1["A1"].bottom(z=-1),
    rate=56 / pipette.flow_rate.aspirate,
)
pipette.aspirate(
    volume=10,
    location=mock_labware_1["B1"].bottom(z=-1),
    rate=56 / pipette.flow_rate.aspirate,
)
pipette.dispense(
    volume=20,
    location=mock_labware_2["B1"].bottom(z=-1),
    rate=80 / pipette.flow_rate.dispense,
)
pipette.flow_rate.blow_out = 50
pipette.blow_out(mock_trash_bin_1)
pipette.drop_tip()`.trimStart()
    )
  })
  it('should generate a distribute step in py', () => {
    const mockStepArgs: DistributeArgs = {
      commandCreatorFnName: 'distribute',
      sourceWell: 'A1',
      destWells: ['A1', 'B1'],
      blowoutFlowRateUlSec: 50,
      blowoutOffsetFromTopMm: -1,
      blowoutLocation: 'source',
      mixBeforeAspirate: null,
      tipRack: 'fixture/fixture_flex_96_tiprack_1000ul/1',
      pipette: 'mockPipette',
      nozzles: null,
      sourceLabware: 'mockSourceLabware',
      destLabware: 'mockDestLabware',
      volume: 10,
      dropTipLocation: 'mockTrashBin',
      preWetTip: false,
      touchTipAfterAspirate: false,
      touchTipAfterAspirateOffsetMmFromTop: 0,
      touchTipAfterAspirateSpeed: null,
      changeTip: 'always',
      aspirateDelay: null,
      aspirateAirGapVolume: null,
      aspirateFlowRateUlSec: 56,
      aspirateOffsetFromBottomMm: -1,
      aspirateXOffset: 0,
      aspirateYOffset: 0,
      dispenseAirGapVolume: null,
      dispenseDelay: null,
      touchTipAfterDispense: false,
      touchTipAfterDispenseOffsetMmFromTop: 0,
      touchTipAfterDispenseSpeed: null,
      dispenseFlowRateUlSec: 80,
      dispenseOffsetFromBottomMm: -1,
      dispenseXOffset: 0,
      dispenseYOffset: 0,
      name: 'transfer',
      description: 'transferring from 1 well to another',
      disposalVolume: null,
    }
    expect(
      quickTransferStepCommands({
        stepArgs: mockStepArgs,
        invariantContext: mockInvariantContext,
        initialRobotState: mockRobotState,
      })
    ).toBe(
      `
# DISTRIBUTE STEP

pipette.pick_up_tip(location=mock_tiprack_1)
pipette.aspirate(
    volume=20,
    location=mock_labware_1["A1"].bottom(z=-1),
    rate=56 / pipette.flow_rate.aspirate,
)
pipette.dispense(
    volume=10,
    location=mock_labware_2["A1"].bottom(z=-1),
    rate=80 / pipette.flow_rate.dispense,
)
pipette.dispense(
    volume=10,
    location=mock_labware_2["B1"].bottom(z=-1),
    rate=80 / pipette.flow_rate.dispense,
)
pipette.drop_tip()`.trimStart()
    )
  })
})
