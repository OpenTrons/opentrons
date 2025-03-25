import { describe, it, expect } from 'vitest'
import { quickTransferStepCommands } from '../../utils/pythonCommands'
import { TransferArgs } from '@opentrons/step-generation'

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
      tipRack: 'mockTiprack',
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
    }
    expect(quickTransferStepCommands({})).toBe(``)
  })
})
