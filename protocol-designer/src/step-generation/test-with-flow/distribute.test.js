// @flow
import {
  getRobotInitialStateNoTipsRemain,
  getRobotStateWithTipStandard,
  makeContext,
  getSuccessResult,
  getErrorResult,
  DEFAULT_PIPETTE,
  SOURCE_LABWARE,
  DEST_LABWARE,
  FIXED_TRASH_ID,
  getFlowRateAndOffsetParams,
  makeAspirateHelper,
  makeDispenseHelper,
  blowoutHelper,
  makeTouchTipHelper,
  pickUpTipHelper,
  dropTipHelper,
} from './fixtures'
import { reduceCommandCreators } from '../utils'
import _distribute from '../commandCreators/compound/distribute'
import type { DistributeArgs } from '../types'

const aspirateHelper = makeAspirateHelper()
const dispenseHelper = makeDispenseHelper()
const touchTipHelper = makeTouchTipHelper()
// TODO: Ian 2019-06-14 more elegant way to test the blowout offset calculation
const BLOWOUT_OFFSET_ANY: any = expect.any(Number)

// collapse this compound command creator into the signature of an atomic command creator
const distribute = (args: DistributeArgs) => (
  invariantContext,
  initialRobotState
) =>
  reduceCommandCreators(_distribute(args)(invariantContext, initialRobotState))(
    invariantContext,
    initialRobotState
  )

let mixinArgs
let invariantContext
let robotStateWithTip
let robotInitialStateNoTipsRemain
let blowoutSingleToTrash
let blowoutSingleToSourceA1

beforeEach(() => {
  mixinArgs = {
    ...getFlowRateAndOffsetParams(),
    commandCreatorFnName: 'distribute',
    name: 'distribute test',
    description: 'test blah blah',

    pipette: DEFAULT_PIPETTE,
    sourceLabware: SOURCE_LABWARE,
    destLabware: DEST_LABWARE,

    preWetTip: false,
    touchTipAfterAspirate: false,
    disposalVolume: 60,
    disposalLabware: FIXED_TRASH_ID,
    disposalWell: 'A1',
    mixBeforeAspirate: null,

    touchTipAfterDispense: false,
  }

  blowoutSingleToTrash = blowoutHelper(FIXED_TRASH_ID, {
    offsetFromBottomMm: BLOWOUT_OFFSET_ANY,
  })
  blowoutSingleToSourceA1 = blowoutHelper(SOURCE_LABWARE, {
    offsetFromBottomMm: BLOWOUT_OFFSET_ANY,
  })

  invariantContext = makeContext()
  robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
  robotInitialStateNoTipsRemain = getRobotInitialStateNoTipsRemain(
    invariantContext
  )
})

describe('distribute: minimal example', () => {
  test('single channel; 60uL from A1 -> A2, A3; no tip pickup', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3'],
      changeTip: 'never',
      volume: 60,
    }
    const result = distribute(distributeArgs)(
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
  test('changeTip: "once"', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'once',
      volume: 90,
    }

    const result = distribute(distributeArgs)(
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

  test('changeTip: "always"', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'always',
      volume: 90,
    }

    const result = distribute(distributeArgs)(
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

  test('changeTip: "never" with carried-over tip', () => {
    // NOTE: this has been used as BASE CASE for the "advanced settings" tests
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 90,
    }
    const result = distribute(distributeArgs)(
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

  test('changeTip: "never" should fail with no initial tip', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'always',
      volume: 150,
    }

    const result = distribute(distributeArgs)(
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

describe('advanced settings: volume, mix, pre-wet tip, tip touch', () => {
  test('mix before aspirate, then aspirate disposal volume', () => {
    // NOTE this also tests "uneven final chunk" eg A6 in [A2 A3 | A4 A5 | A6]
    // which is especially relevant to disposal volume
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5', 'A6'],
      changeTip: 'never',
      volume: 120,

      mixFirstAspirate: true,
      disposalVolume: 12,
      disposalLabware: SOURCE_LABWARE,
      disposalWell: 'A1',
    }
    const result = distribute(distributeArgs)(
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    const aspirateVol = 120 * 2 + 12

    expect(res.commands).toEqual([
      aspirateHelper('A1', aspirateVol),
      dispenseHelper('A2', 120),
      dispenseHelper('A3', 120),
      blowoutSingleToSourceA1,

      aspirateHelper('A1', aspirateVol),
      dispenseHelper('A4', 120),
      dispenseHelper('A5', 120),
      blowoutSingleToSourceA1,

      aspirateHelper('A1', 120 + 12),
      dispenseHelper('A6', 120),
      blowoutSingleToSourceA1,
    ])
  })

  test.skip('pre-wet tip', () => {
    // TODO Ian 2018-05-04 pre-wet volume is TBD.
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 150,
      preWetTip: true,
    }
    const result = distribute(distributeArgs)(
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    const preWetVolume = 42 // TODO what is pre-wet volume?

    const preWetTipCommands = [
      aspirateHelper('A1', preWetVolume),
      dispenseHelper('A1', preWetVolume, { labware: SOURCE_LABWARE }),
    ]

    expect(res.commands).toEqual([
      ...preWetTipCommands,
      aspirateHelper('A1', 300),
      dispenseHelper('A2', 150),
      dispenseHelper('A3', 150),
      blowoutSingleToTrash,
      ...preWetTipCommands,
      aspirateHelper('A1', 300),
      dispenseHelper('A4', 150),
      dispenseHelper('A5', 150),
      blowoutSingleToTrash,
    ])
  })

  test('touch tip after aspirate', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 90,
      touchTipAfterAspirate: true,
    }
    const result = distribute(distributeArgs)(
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

  test('touch tip after dispense', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 90,
      touchTipAfterDispense: true,
    }
    const result = distribute(distributeArgs)(
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

  test('mix before aspirate w/ disposal vol', () => {
    const volume = 130
    const disposalVolume = 20
    const disposalLabware = SOURCE_LABWARE
    const disposalWell = 'A1'
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
      disposalLabware,
      disposalWell,
    }

    const result = distribute(distributeArgs)(
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    const mixCommands = [
      // mix 1
      aspirateHelper('A1', 250),
      dispenseHelper('A1', 250, { labware: SOURCE_LABWARE }),
      // mix 2
      aspirateHelper('A1', 250),
      dispenseHelper('A1', 250, { labware: SOURCE_LABWARE }),
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
})

describe('invalid input + state errors', () => {
  test('invalid pipette ID should throw error', () => {
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3'],
      changeTip: 'never',
      volume: 100,
      pipette: 'no-such-pipette-id-here',
    }

    const result = distribute(distributeArgs)(
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
  test(`no disposal volume`, () => {
    const changeTip = 'once'
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3'],
      changeTip,
      volume: 350,
      disposalVolume: null,
      disposalLabware: null,
      disposalWell: null,
    }
    const result = distribute(distributeArgs)(
      invariantContext,
      robotStateWithTip
    )
    const res = getErrorResult(result)

    expect(res.errors).toHaveLength(1)
    expect(res.errors[0].type).toEqual('PIPETTE_VOLUME_EXCEEDED')
  })

  test(`with disposal volume`, () => {
    const changeTip = 'once'
    const distributeArgs: DistributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3'],
      changeTip,
      volume: 250,
      disposalVolume: 100,
      disposalLabware: FIXED_TRASH_ID,
      disposalWell: 'A1',
    }
    const result = distribute(distributeArgs)(
      invariantContext,
      robotStateWithTip
    )
    const res = getErrorResult(result)

    expect(res.errors).toHaveLength(1)
    expect(res.errors[0].type).toEqual('PIPETTE_VOLUME_EXCEEDED')
  })
})
