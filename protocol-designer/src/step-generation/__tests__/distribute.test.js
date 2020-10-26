// @flow
import {
  ASPIRATE_OFFSET_FROM_BOTTOM_MM,
  blowoutHelper,
  DEFAULT_PIPETTE,
  delayCommand,
  delayWithOffset,
  DEST_LABWARE,
  dropTipHelper,
  FIXED_TRASH_ID,
  getErrorResult,
  getFlowRateAndOffsetParamsTransferLike,
  getRobotInitialStateNoTipsRemain,
  getRobotStateWithTipStandard,
  getSuccessResult,
  makeAirGapHelper,
  makeAspirateHelper,
  makeContext,
  makeDispenseHelper,
  makeDispenseAirGapHelper,
  makeTouchTipHelper,
  pickUpTipHelper,
  SOURCE_LABWARE,
} from '../__fixtures__'
import { distribute } from '../commandCreators/compound/distribute'
import type { Command } from '@opentrons/shared-data/protocol/flowTypes/schemaV6.js'
import type { DistributeArgs } from '../types'
import {
  SOURCE_WELL_BLOWOUT_DESTINATION,
  DEST_WELL_BLOWOUT_DESTINATION,
} from '../utils/misc'

// well depth for 96 plate is 10.54, so need to add 1mm to top of well
const airGapHelper = makeAirGapHelper({ offsetFromBottomMm: 11.54 })
const dispenseAirGapHelper = makeDispenseAirGapHelper({
  offsetFromBottomMm: 11.54,
})
const aspirateHelper = makeAspirateHelper()
const dispenseHelper = makeDispenseHelper()
const touchTipHelper = makeTouchTipHelper()
// TODO: Ian 2019-06-14 more elegant way to test the blowout offset calculation
const BLOWOUT_OFFSET_ANY: any = expect.any(Number)

let mixinArgs: $Shape<DistributeArgs>
let invariantContext
let robotStateWithTip
let robotInitialStateNoTipsRemain
let blowoutSingleToTrash
let blowoutSingleToSourceA1
let blowoutSingleToDestA4
let blowoutSingleToDestA3

beforeEach(() => {
  mixinArgs = {
    ...getFlowRateAndOffsetParamsTransferLike(),
    commandCreatorFnName: 'distribute',
    name: 'distribute test',
    description: 'test blah blah',

    pipette: DEFAULT_PIPETTE,
    sourceLabware: SOURCE_LABWARE,
    destLabware: DEST_LABWARE,

    preWetTip: false,
    touchTipAfterAspirate: false,
    disposalVolume: 60,
    blowoutLocation: FIXED_TRASH_ID,
    mixBeforeAspirate: null,
    aspirateDelay: null,
    dispenseDelay: null,
    aspirateAirGapVolume: null,
    touchTipAfterDispense: false,
  }

  blowoutSingleToTrash = blowoutHelper(FIXED_TRASH_ID, {
    offsetFromBottomMm: BLOWOUT_OFFSET_ANY,
  })
  blowoutSingleToSourceA1 = blowoutHelper(SOURCE_LABWARE, {
    offsetFromBottomMm: BLOWOUT_OFFSET_ANY,
  })
  blowoutSingleToDestA4 = blowoutHelper(DEST_LABWARE, {
    offsetFromBottomMm: BLOWOUT_OFFSET_ANY,
    well: 'A4',
  })
  blowoutSingleToDestA3 = blowoutHelper(DEST_LABWARE, {
    offsetFromBottomMm: BLOWOUT_OFFSET_ANY,
    well: 'A3',
  })

  invariantContext = makeContext()
  robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
  robotInitialStateNoTipsRemain = getRobotInitialStateNoTipsRemain(
    invariantContext
  )
})

describe('distribute: minimal example', () => {
  it('single channel; 60uL from A1 -> A2, A3; no tip pickup', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3'],
      changeTip: 'never',
      volume: 60,
    }
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 180),
      dispenseHelper('A2', 60),
      dispenseHelper('A3', 60),
      blowoutSingleToTrash,
    ])
  })
})

describe('tip handling for multiple distribute chunks', () => {
  it('changeTip: "once"', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'once',
      volume: 90,
    }

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      dropTipHelper('A1'),
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 240),
      dispenseHelper('A2', 90),
      dispenseHelper('A3', 90),
      blowoutSingleToTrash,

      aspirateHelper('A1', 240),
      dispenseHelper('A4', 90),
      dispenseHelper('A5', 90),

      blowoutSingleToTrash,
    ])
  })

  it('changeTip: "always"', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'always',
      volume: 90,
    }

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      dropTipHelper('A1'),
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 240),
      dispenseHelper('A2', 90),
      dispenseHelper('A3', 90),
      blowoutSingleToTrash,

      // next chunk, change tip
      dropTipHelper('A1'),
      pickUpTipHelper('B1'),
      aspirateHelper('A1', 240),
      dispenseHelper('A4', 90),
      dispenseHelper('A5', 90),
      blowoutSingleToTrash,
    ])
  })

  it('changeTip: "never" with carried-over tip', () => {
    // NOTE: this has been used as BASE CASE for the "advanced settings" tests
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 90,
    }
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      aspirateHelper('A1', 240),
      dispenseHelper('A2', 90),
      dispenseHelper('A3', 90),
      blowoutSingleToTrash,
      aspirateHelper('A1', 240),
      dispenseHelper('A4', 90),
      dispenseHelper('A5', 90),
      blowoutSingleToTrash,
    ])
  })

  it('changeTip: "never" should fail with no initial tip', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'always',
      volume: 150,
    }

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotInitialStateNoTipsRemain
    )
    const res = getErrorResult(result)

    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toMatchObject({
      type: 'INSUFFICIENT_TIPS',
    })
  })
})

describe('advanced settings: volume, mix, pre-wet tip, tip touch, tip position', () => {
  let mixCommandsWithDelay: Array<Command>
  beforeEach(() => {
    mixCommandsWithDelay = [
      aspirateHelper('A1', 35),
      delayCommand(11),
      dispenseHelper('A1', 35, {
        labware: SOURCE_LABWARE,
        offsetFromBottomMm: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
      }),
      delayCommand(12),
    ]
  })
  it('should mix before aspirate, then aspirate disposal volume', () => {
    // NOTE this also tests "uneven final chunk" eg A6 in [A2 A3 | A4 A5 | A6]
    // which is especially relevant to disposal volume
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5', 'A6'],
      changeTip: 'never',
      volume: 120,
      mixBeforeAspirate: { times: 2, volume: 50 },
      disposalVolume: 12,
      blowoutLocation: SOURCE_LABWARE,
    }
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    const aspirateVol = 120 * 2 + 12
    const mixCommands = [
      // mix 1
      aspirateHelper('A1', 50),
      dispenseHelper('A1', 50, {
        labware: SOURCE_LABWARE,
        offsetFromBottomMm: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
      }),
      // mix 2
      aspirateHelper('A1', 50),
      dispenseHelper('A1', 50, {
        labware: SOURCE_LABWARE,
        offsetFromBottomMm: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
      }),
    ]
    expect(res.commands).toEqual([
      ...mixCommands,
      aspirateHelper('A1', aspirateVol),
      dispenseHelper('A2', 120),
      dispenseHelper('A3', 120),
      blowoutSingleToSourceA1,

      ...mixCommands,
      aspirateHelper('A1', aspirateVol),
      dispenseHelper('A4', 120),
      dispenseHelper('A5', 120),
      blowoutSingleToSourceA1,

      ...mixCommands,
      aspirateHelper('A1', 120 + 12),
      dispenseHelper('A6', 120),
      blowoutSingleToSourceA1,
    ])
  })

  // TODO(IL, 2020-02-28): pre-wet volume is not implemented for distribute! #5122
  //
  // TODO(IL, 2020-08-18): don't forget to add delay tests for pre-wet when that is implemented
  it.todo('should pre-wet tip')
  // (() => {
  //   const distributeArgs: DistributeArgs = {
  //     ...mixinArgs,
  //     sourceWell: 'A1',
  //     destWells: ['A2', 'A3', 'A4', 'A5'],
  //     changeTip: 'never',
  //     volume: 150,
  //     preWetTip: true,
  //   }
  //   const result = distribute(
  //     distributeArgs,
  //     invariantContext,
  //     robotStateWithTip
  //   )
  //   const res = getSuccessResult(result)

  //   const preWetVolume = 42 // TODO what is pre-wet volume?

  //   const preWetTipCommands = [
  //     aspirateHelper('A1', preWetVolume),
  //     dispenseHelper('A1', preWetVolume, { labware: SOURCE_LABWARE }),
  //   ]

  //   expect(res.commands).toEqual([
  //     ...preWetTipCommands,
  //     aspirateHelper('A1', 300),
  //     dispenseHelper('A2', 150),
  //     dispenseHelper('A3', 150),
  //     blowoutSingleToTrash,
  //     ...preWetTipCommands,
  //     aspirateHelper('A1', 300),
  //     dispenseHelper('A4', 150),
  //     dispenseHelper('A5', 150),
  //     blowoutSingleToTrash,
  //   ])
  // })

  it('should delay after aspirate', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      aspirateDelay: { seconds: 12, mmFromBottom: 14 },
      // no blowout
      disposalVolume: 0,
    }

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 300),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      dispenseHelper('A2', 100),
      dispenseHelper('A3', 100),
      dispenseHelper('A4', 100),

      aspirateHelper('A1', 100),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      dispenseHelper('A5', 100),
    ])
  })
  it('should delay after air gap aspirate and regular aspirate', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      aspirateDelay: { seconds: 12, mmFromBottom: 14 },
      aspirateAirGapVolume: 5,
      // no blowout
      disposalVolume: 0,
    }

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 200),
      ...delayWithOffset('A1', SOURCE_LABWARE),

      airGapHelper('A1', 5),
      delayCommand(12),

      dispenseAirGapHelper('A2', 5),
      dispenseHelper('A2', 100),
      dispenseHelper('A3', 100),

      aspirateHelper('A1', 200),
      ...delayWithOffset('A1', SOURCE_LABWARE),

      airGapHelper('A1', 5),
      delayCommand(12),
      dispenseAirGapHelper('A4', 5),
      dispenseHelper('A4', 100),
      dispenseHelper('A5', 100),
    ])
  })

  it('should air gap after aspirate and break into two chunks', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      aspirateAirGapVolume: 5,
      // no blowout
      disposalVolume: 0,
    }

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 200),
      airGapHelper('A1', 5),
      dispenseAirGapHelper('A2', 5),
      dispenseHelper('A2', 100),
      dispenseHelper('A3', 100),

      aspirateHelper('A1', 200),
      airGapHelper('A1', 5),
      dispenseAirGapHelper('A4', 5),
      dispenseHelper('A4', 100),
      dispenseHelper('A5', 100),
    ])
  })

  it('should delay after air gap dispense and regular dispense', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      dispenseDelay: { seconds: 12, mmFromBottom: 14 },
      aspirateAirGapVolume: 5,
      // no blowout
      disposalVolume: 0,
    }

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 200),
      airGapHelper('A1', 5),

      dispenseAirGapHelper('A2', 5),
      delayCommand(12),
      dispenseHelper('A2', 100),
      ...delayWithOffset('A2', DEST_LABWARE),
      dispenseHelper('A3', 100),
      ...delayWithOffset('A3', DEST_LABWARE),

      aspirateHelper('A1', 200),
      airGapHelper('A1', 5),

      dispenseAirGapHelper('A4', 5),
      delayCommand(12),
      dispenseHelper('A4', 100),
      ...delayWithOffset('A4', DEST_LABWARE),
      dispenseHelper('A5', 100),
      ...delayWithOffset('A5', DEST_LABWARE),
    ])
  })

  it('should delay after mix aspirate and regular aspirate', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      aspirateDelay: { seconds: 12, mmFromBottom: 14 },
      mixBeforeAspirate: { times: 2, volume: 50 },
      disposalVolume: 0,
    }

    mixCommandsWithDelay = [
      // mix 1
      aspirateHelper('A1', 50),
      delayCommand(12),
      dispenseHelper('A1', 50, {
        labware: SOURCE_LABWARE,
        offsetFromBottomMm: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
      }),
      // mix 2
      aspirateHelper('A1', 50),
      delayCommand(12),
      dispenseHelper('A1', 50, {
        labware: SOURCE_LABWARE,
        offsetFromBottomMm: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
      }),
    ]

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      ...mixCommandsWithDelay,
      aspirateHelper('A1', 300),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      dispenseHelper('A2', 100),
      dispenseHelper('A3', 100),
      dispenseHelper('A4', 100),

      ...mixCommandsWithDelay,
      aspirateHelper('A1', 100),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      dispenseHelper('A5', 100),
    ])
  })

  it('should touch tip after aspirate', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 90,
      touchTipAfterAspirate: true,
    }
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      aspirateHelper('A1', 240),
      touchTipHelper('A1'),
      dispenseHelper('A2', 90),
      dispenseHelper('A3', 90),
      blowoutSingleToTrash,

      aspirateHelper('A1', 240),
      touchTipHelper('A1'),
      dispenseHelper('A4', 90),
      dispenseHelper('A5', 90),
      blowoutSingleToTrash,
    ])
  })

  it('should touch tip after dispense', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 90,
      touchTipAfterDispense: true,
    }
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      aspirateHelper('A1', 240),
      dispenseHelper('A2', 90),
      touchTipHelper('A2', { labware: DEST_LABWARE }),
      dispenseHelper('A3', 90),
      touchTipHelper('A3', { labware: DEST_LABWARE }),
      blowoutSingleToTrash,

      aspirateHelper('A1', 240),
      dispenseHelper('A4', 90),
      touchTipHelper('A4', { labware: DEST_LABWARE }),
      dispenseHelper('A5', 90),
      touchTipHelper('A5', { labware: DEST_LABWARE }),
      blowoutSingleToTrash,
    ])
  })

  it('should mix before aspirate w/ disposal vol', () => {
    const volume = 130
    const disposalVolume = 20
    const aspirateVol = volume * 2 + disposalVolume
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume,
      mixBeforeAspirate: {
        volume: 250,
        times: 2,
      },
      disposalVolume,
      blowoutLocation: SOURCE_LABWARE,
    }

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    const mixCommands = [
      // mix 1
      aspirateHelper('A1', 250),
      dispenseHelper('A1', 250, {
        labware: SOURCE_LABWARE,
        offsetFromBottomMm: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
      }),
      // mix 2
      aspirateHelper('A1', 250),
      dispenseHelper('A1', 250, {
        labware: SOURCE_LABWARE,
        offsetFromBottomMm: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
      }),
    ]

    expect(res.commands).toEqual([
      ...mixCommands,
      aspirateHelper('A1', aspirateVol),
      dispenseHelper('A2', volume),
      dispenseHelper('A3', volume),
      blowoutSingleToSourceA1,

      ...mixCommands,
      aspirateHelper('A1', aspirateVol),
      dispenseHelper('A4', volume),
      dispenseHelper('A5', volume),
      blowoutSingleToSourceA1,
    ])
  })

  it('should delay after dispense', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      dispenseDelay: { seconds: 12, mmFromBottom: 14 },
      // no blowout
      disposalVolume: 0,
    }

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 300),
      dispenseHelper('A2', 100),
      ...delayWithOffset('A2', DEST_LABWARE),
      dispenseHelper('A3', 100),
      ...delayWithOffset('A3', DEST_LABWARE),
      dispenseHelper('A4', 100),
      ...delayWithOffset('A4', DEST_LABWARE),

      aspirateHelper('A1', 100),
      dispenseHelper('A5', 100),
      ...delayWithOffset('A5', DEST_LABWARE),
    ])
  })
  it('should delay after mix dispense AND regular dispense', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      dispenseDelay: { seconds: 12, mmFromBottom: 14 },
      mixBeforeAspirate: { times: 2, volume: 50 },
      disposalVolume: 0,
    }

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    const mixCommandsWithDelay = [
      // mix 1
      aspirateHelper('A1', 50),
      dispenseHelper('A1', 50, {
        labware: SOURCE_LABWARE,
        offsetFromBottomMm: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
      }),
      delayCommand(12),
      // mix 2
      aspirateHelper('A1', 50),
      dispenseHelper('A1', 50, {
        labware: SOURCE_LABWARE,
        offsetFromBottomMm: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
      }),
      delayCommand(12),
    ]
    expect(res.commands).toEqual([
      ...mixCommandsWithDelay,
      aspirateHelper('A1', 300),
      dispenseHelper('A2', 100),
      ...delayWithOffset('A2', DEST_LABWARE),
      dispenseHelper('A3', 100),
      ...delayWithOffset('A3', DEST_LABWARE),
      dispenseHelper('A4', 100),
      ...delayWithOffset('A4', DEST_LABWARE),

      ...mixCommandsWithDelay,
      aspirateHelper('A1', 100),

      dispenseHelper('A5', 100),
      ...delayWithOffset('A5', DEST_LABWARE),
    ])
  })

  describe('all advanced settings enabled', () => {
    let allArgs: $Shape<DistributeArgs>
    beforeEach(() => {
      allArgs = {
        ...mixinArgs,
        sourceWell: 'A1',
        destWells: ['B1', 'B2'],
        changeTip: 'never',
        volume: 45,
        // aspirate column
        preWetTip: true,
        mixBeforeAspirate: {
          volume: 35,
          times: 1,
        },
        aspirateDelay: { seconds: 11, mmFromBottom: 15 },
        touchTipAfterAspirate: true,
        touchTipAfterAspirateOffsetMmFromBottom: 14.5,
        aspirateAirGapVolume: 31,
        // dispense column
        dispenseDelay: { seconds: 12, mmFromBottom: 14 },
        touchTipAfterDispense: true,
        blowoutFlowRateUlSec: 2.3,
        blowoutOffsetFromTopMm: 3.3,
        dispenseAirGapVolume: 3,
      }
    })
    it('should create commands in the expected order with expected params', () => {
      const args: $Shape<DistributeArgs> = {
        ...mixinArgs,
        sourceWell: 'A1',
        destWells: ['B1', 'B2'],
        changeTip: 'never',
        volume: 45,
        // aspirate column
        preWetTip: true,
        mixBeforeAspirate: {
          volume: 35,
          times: 1,
        },
        aspirateDelay: { seconds: 11, mmFromBottom: 15 },
        touchTipAfterAspirate: true,
        touchTipAfterAspirateOffsetMmFromBottom: 14.5,
        aspirateAirGapVolume: 31,
        // dispense column
        dispenseDelay: { seconds: 12, mmFromBottom: 14 },
        touchTipAfterDispense: true,
        blowoutFlowRateUlSec: 2.3,
        blowoutOffsetFromTopMm: 3.3,
      }

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // mix (asp)
        aspirateHelper('A1', 35),
        delayCommand(11),
        dispenseHelper('A1', 35, {
          labware: SOURCE_LABWARE,
          offsetFromBottomMm: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
        }),
        delayCommand(12),
        // aspirate
        aspirateHelper('A1', 150),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('B1', 31),
        delayCommand(12),
        dispenseHelper('B1', 45),
        ...delayWithOffset('B1', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('B1', { labware: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('B2', 45),
        ...delayWithOffset('B2', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('B2', { labware: DEST_LABWARE }),
        // blowout
        blowoutSingleToTrash,
      ])
    })
    it('should create commands in the expected order with expected params (blowout in trash, reuse tip)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'never',
        blowoutLocation: 'trashId',
      }

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // no need to pickup tip/drop tip since change tip is never
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labware: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labware: DEST_LABWARE }),
        // blowout into trash since we are not changing tip
        blowoutSingleToTrash,
        // next chunk from A1: remaining volume
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        // dispense #3
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labware: DEST_LABWARE }),
        blowoutSingleToTrash,
        // use the dispense > air gap here before moving to trash
        airGapHelper('A4', 3, { labware: DEST_LABWARE }),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        dropTipHelper('A1'),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in trash, change tip each aspirate)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'always',
        blowoutLocation: 'trashId',
      }

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // replace tip since change tip is always
        dropTipHelper('A1'),
        pickUpTipHelper('A1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labware: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labware: DEST_LABWARE }),
        blowoutSingleToTrash,
        // dispense > air gap since we are about to change the tip
        airGapHelper('A3', 3, { labware: DEST_LABWARE }), // need to air gap here
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        dropTipHelper('A1'),
        // next chunk from A1: remaining volume
        pickUpTipHelper('B1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labware: DEST_LABWARE }),
        blowoutSingleToTrash,
        // use the dispense > air gap here before moving to trash
        airGapHelper('A4', 3, { labware: DEST_LABWARE }),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        // skip blowout into trash b/c we're about to drop tip anyway
        dropTipHelper('A1'),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in trash, change tip once)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'once',
        blowoutLocation: 'trashId',
      }

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // replace tip at the beginning of the step
        dropTipHelper('A1'),
        pickUpTipHelper('A1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labware: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labware: DEST_LABWARE }),
        blowoutSingleToTrash,
        // skip dispense > air gap since we are reusing the tip
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labware: DEST_LABWARE }),
        blowoutSingleToTrash,
        // use the dispense > air gap here before moving to trash
        airGapHelper('A4', 3, { labware: DEST_LABWARE }),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        dropTipHelper('A1'),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in source, reuse tip)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'never',
        blowoutLocation: SOURCE_WELL_BLOWOUT_DESTINATION,
      }

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // no need to replace tip since change tip is never
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labware: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labware: DEST_LABWARE }),
        // blowout location is source so we gotta blowout
        blowoutSingleToSourceA1,
        // skip dispense > air gap since we are reusing the tip
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labware: DEST_LABWARE }),
        // blowout location is source so we gotta blowout
        blowoutSingleToSourceA1,
        // use the dispense > air gap here before moving to trash since it is the final dispense in the step
        // dispense > air gap from source since blowout location is source
        airGapHelper('A1', 3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        dropTipHelper('A1'),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in source, change tip each aspirate)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'always',
        blowoutLocation: SOURCE_WELL_BLOWOUT_DESTINATION,
      }

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // replace tip
        dropTipHelper('A1'),
        pickUpTipHelper('A1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labware: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labware: DEST_LABWARE }),
        // blowout location is source so need to blowout
        blowoutSingleToSourceA1,
        // dispense > air gap so no liquid drops off the tip as pipette moves from source well to trash
        airGapHelper('A1', 3),
        // delay after aspirating air
        delayCommand(11),
        // just drop the tip in the trash
        dropTipHelper('A1'),
        // next chunk from A1: remaining volume
        pickUpTipHelper('B1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labware: DEST_LABWARE }),
        // blowout location is source so need to blowout
        blowoutSingleToSourceA1,
        // dispense > air gap so no liquid drops off the tip as pipette moves from source well to trash
        airGapHelper('A1', 3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        dropTipHelper('A1'),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in source, change tip once)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'once',
        blowoutLocation: SOURCE_WELL_BLOWOUT_DESTINATION,
      }

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // replace tip
        dropTipHelper('A1'),
        pickUpTipHelper('A1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labware: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labware: DEST_LABWARE }),
        // blowout location is source so we gotta blowout
        blowoutSingleToSourceA1,
        // skip dispense > air gap since tip is being reused
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labware: DEST_LABWARE }),
        // use the dispense > air gap here before moving to trash
        // since it is the final dispense in the step
        blowoutSingleToSourceA1,
        airGapHelper('A1', 3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        dropTipHelper('A1'),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in dest, reuse tip)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'never',
        blowoutLocation: DEST_WELL_BLOWOUT_DESTINATION,
      }

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // no need to replace tip since changeTip is never
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labware: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labware: DEST_LABWARE }),
        // blowout location is dest so we gotta blowout
        blowoutSingleToDestA3,
        // skip dispense > air gap since we are reusing the tip
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labware: DEST_LABWARE }),
        // blowout location is dest so we gotta blowout
        blowoutSingleToDestA4,
        // use the dispense > air gap here before moving to trash
        // since it is the final dispense in the step
        airGapHelper('A4', 3, { labware: DEST_LABWARE }),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        dropTipHelper('A1'),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in dest, change tip each aspirate)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'always',
        blowoutLocation: DEST_WELL_BLOWOUT_DESTINATION,
      }

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // replace tip
        dropTipHelper('A1'),
        pickUpTipHelper('A1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labware: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labware: DEST_LABWARE }),
        // blowout location is dest so we gotta blowout
        blowoutSingleToDestA3,
        // dispense > air gap so no liquid drops off the tip as pipette moves from destination well to trash
        airGapHelper('A3', 3, { labware: DEST_LABWARE }),
        // dispense delay
        delayCommand(11),
        // just drop the tip in the trash
        dropTipHelper('A1'),
        // next chunk from A1: remaining volume
        pickUpTipHelper('B1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labware: DEST_LABWARE }),
        // use the dispense > air gap here before moving to trash
        // since it is the final dispense in the step
        blowoutSingleToDestA4,
        airGapHelper('A4', 3, { labware: DEST_LABWARE }),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        dropTipHelper('A1'),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in dest, change tip once)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'once',
        blowoutLocation: DEST_WELL_BLOWOUT_DESTINATION,
      }

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // replace tip
        dropTipHelper('A1'),
        pickUpTipHelper('A1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labware: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labware: DEST_LABWARE }),
        // blowout location is dest so we gotta blowout
        blowoutSingleToDestA3,
        // skip dispense > air gap since tip is being reused
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', { offsetFromBottomMm: 14.5 }),
        // aspirate > air gap
        airGapHelper('A1', 31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labware: DEST_LABWARE }),
        // blowout location is dest so need to blowout
        blowoutSingleToDestA4,
        // use the dispense > air gap here before moving to trash
        // since it is the final dispense in the step
        airGapHelper('A4', 3, { labware: DEST_LABWARE }),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        dropTipHelper('A1'),
      ])
    })
  })
})

describe('invalid input + state errors', () => {
  it('invalid pipette ID should throw error', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3'],
      changeTip: 'never',
      volume: 100,
      pipette: 'no-such-pipette-id-here',
    }

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getErrorResult(result)

    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toMatchObject({
      type: 'PIPETTE_DOES_NOT_EXIST',
    })
  })
})

describe('distribute volume exceeds pipette max volume', () => {
  it(`no disposal volume`, () => {
    const changeTip = 'once'
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3'],
      changeTip,
      volume: 350,
      disposalVolume: null,
    }
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getErrorResult(result)

    expect(res.errors).toHaveLength(1)
    expect(res.errors[0].type).toEqual('PIPETTE_VOLUME_EXCEEDED')
  })

  it(`with disposal volume`, () => {
    const changeTip = 'once'
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3'],
      changeTip,
      volume: 250,
      disposalVolume: 100,
    }
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getErrorResult(result)

    expect(res.errors).toHaveLength(1)
    expect(res.errors[0].type).toEqual('PIPETTE_VOLUME_EXCEEDED')
  })
})
