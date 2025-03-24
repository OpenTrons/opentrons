import { beforeEach, describe, it, expect } from 'vitest'
import flatMap from 'lodash/flatMap'
import {
  FIXED_TRASH_ID,
  fixtureTiprack300ul,
  getLabwareDefURI,
} from '@opentrons/shared-data'
import { mix } from '../commandCreators/compound/mix'
import {
  getRobotStateWithTipStandard,
  makeContext,
  getSuccessResult,
  getErrorResult,
  replaceTipCommands,
  getFlowRateAndOffsetParamsMix,
  DEFAULT_PIPETTE,
  SOURCE_LABWARE,
  DEST_LABWARE,
  makeAspirateHelper,
  makeDispenseHelper,
  blowoutHelper,
  makeTouchTipHelper,
  delayCommand,
} from '../fixtures'
import type {
  AspDispAirgapParams,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type {
  ChangeTipOptions,
  InvariantContext,
  MixArgs,
  RobotState,
} from '../types'

const aspirateHelper = makeAspirateHelper()
const dispenseHelper = makeDispenseHelper({ labwareId: SOURCE_LABWARE })
const touchTipHelper = makeTouchTipHelper()
// TODO: Ian 2019-06-14 more elegant way to test the blowout offset calculation
const BLOWOUT_OFFSET_ANY: any = expect.any(Number)

let invariantContext: InvariantContext
let robotStateWithTip: RobotState
let mixinArgs: Partial<MixArgs>

const mockWellLocation: Partial<AspDispAirgapParams> = {
  wellLocation: {
    origin: 'bottom',
    offset: { x: 0, y: 0, z: 3.2 },
  },
}

beforeEach(() => {
  mixinArgs = {
    ...getFlowRateAndOffsetParamsMix(),
    commandCreatorFnName: 'mix',
    name: 'mix test',
    description: 'test blah blah',
    tipRack: getLabwareDefURI(fixtureTiprack300ul as LabwareDefinition2),
    pipette: DEFAULT_PIPETTE,
    labware: SOURCE_LABWARE,

    blowoutLocation: null,
    touchTip: false,
    offsetFromBottomMm: 3.2,
    aspirateDelaySeconds: null,
    dispenseDelaySeconds: null,
    dropTipLocation: FIXED_TRASH_ID,
    xOffset: 0,
    yOffset: 0,
  }

  invariantContext = makeContext()
  robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
})

describe('mix: change tip', () => {
  const volume = 5
  const times = 2
  const makeArgs = (changeTip: ChangeTipOptions): MixArgs =>
    ({
      ...mixinArgs,
      volume,
      times,
      wells: ['A1', 'B1', 'C1'],
      changeTip,
    } as MixArgs)
  it('changeTip="always" with no advanced settings', () => {
    const args = makeArgs('always')
    const result = mix(args, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual(
      flatMap(args.wells, (well: string, idx: number) => [
        ...replaceTipCommands(idx),
        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),

        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),
      ])
    )
    expect(res.python).toBe(
      `
mockPythonName.drop_tip()
mockPythonName.pick_up_tip(location=mockPythonName)
mockPythonName.flow_rate.aspirate = 2.1
mockPythonName.flow_rate.dispense = 2.2
mockPythonName.mix(
    repetitions=2,
    volume=5,
    location=mockPythonName["A1"].bottom(z=3.2),
)
mockPythonName.drop_tip()
mockPythonName.pick_up_tip(location=mockPythonName)
mockPythonName.flow_rate.aspirate = 2.1
mockPythonName.flow_rate.dispense = 2.2
mockPythonName.mix(
    repetitions=2,
    volume=5,
    location=mockPythonName["B1"].bottom(z=3.2),
)
mockPythonName.drop_tip()
mockPythonName.pick_up_tip(location=mockPythonName)
mockPythonName.flow_rate.aspirate = 2.1
mockPythonName.flow_rate.dispense = 2.2
mockPythonName.mix(
    repetitions=2,
    volume=5,
    location=mockPythonName["C1"].bottom(z=3.2),
)`.trimStart()
    )
  })

  it('changeTip="once"', () => {
    const args = makeArgs('once')
    const result = mix(args, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      ...replaceTipCommands(0),
      ...flatMap(args.wells, well => [
        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),
        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),
      ]),
    ])
  })

  it('changeTip="never"', () => {
    const args = makeArgs('never')
    const result = mix(args, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual(
      flatMap(args.wells, well => [
        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),
        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),
      ])
    )
  })
})

describe('mix: advanced options', () => {
  const volume = 8
  const times = 2
  const blowoutLabwareId = DEST_LABWARE

  it('flow rate', () => {
    const args = {
      ...mixinArgs,
      volume,
      times,
      wells: ['A1'],
      changeTip: 'once',
    } as MixArgs

    const result = mix(args, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      ...replaceTipCommands(0),
      aspirateHelper('A1', volume, mockWellLocation),
      dispenseHelper('A1', volume, mockWellLocation),
      aspirateHelper('A1', volume, mockWellLocation),
      dispenseHelper('A1', volume, mockWellLocation),
    ])
  })

  it('touch tip (after each dispense)', () => {
    const args: MixArgs = {
      ...mixinArgs,
      volume,
      times,
      changeTip: 'always',
      touchTip: true,
      wells: ['A1', 'B1', 'C1'],
    } as MixArgs

    const result = mix(args, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual(
      flatMap(args.wells, (well: string, idx: number) => [
        ...replaceTipCommands(idx),
        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),

        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),
        touchTipHelper(well),
      ])
    )
  })

  it('blowout', () => {
    const args: MixArgs = {
      ...mixinArgs,
      volume,
      times,
      changeTip: 'always',
      blowoutLocation: blowoutLabwareId,
      wells: ['A1', 'B1', 'C1'],
    } as MixArgs

    const result = mix(args, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual(
      flatMap(args.wells, (well, idx) => [
        ...replaceTipCommands(idx),
        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),

        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),
        blowoutHelper(blowoutLabwareId, {
          wellLocation: {
            origin: 'top',
            offset: {
              z: BLOWOUT_OFFSET_ANY,
            },
          },
        }),
      ])
    )
  })

  it('touch tip after blowout', () => {
    const args: MixArgs = {
      ...mixinArgs,
      volume,
      times,
      changeTip: 'always',
      blowoutLocation: blowoutLabwareId,
      touchTip: true,
      wells: ['A1', 'B1', 'C1'],
    } as MixArgs

    const result = mix(args, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual(
      flatMap(args.wells, (well, idx) => [
        ...replaceTipCommands(idx),
        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),

        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),
        blowoutHelper(blowoutLabwareId, {
          wellLocation: {
            origin: 'top',
            offset: {
              z: BLOWOUT_OFFSET_ANY,
            },
          },
        }),
        touchTipHelper(well),
      ])
    )
  })
  it('should delay after aspirating', () => {
    const args: MixArgs = {
      ...mixinArgs,
      aspirateDelaySeconds: 12,
      volume,
      times,
      changeTip: 'always',
      wells: ['A1', 'B1', 'C1'],
    } as MixArgs

    const result = mix(args, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual(
      flatMap(args.wells, (well, idx) => [
        ...replaceTipCommands(idx),
        aspirateHelper(well, volume, mockWellLocation),
        delayCommand(12),
        dispenseHelper(well, volume, mockWellLocation),
        aspirateHelper(well, volume, mockWellLocation),
        delayCommand(12),
        dispenseHelper(well, volume, mockWellLocation),
      ])
    )
  })
  it('should delay after dispensing', () => {
    const args: MixArgs = {
      ...mixinArgs,
      dispenseDelaySeconds: 12,
      volume,
      times,
      changeTip: 'always',
      wells: ['A1', 'B1', 'C1'],
    } as MixArgs

    const result = mix(args, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual(
      flatMap(args.wells, (well, idx) => [
        ...replaceTipCommands(idx),
        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),
        delayCommand(12),
        aspirateHelper(well, volume, mockWellLocation),
        dispenseHelper(well, volume, mockWellLocation),
        delayCommand(12),
      ])
    )
  })
  describe('all advanced settings enabled', () => {
    it('should create commands in the expected order with expected params with all args', () => {
      const args: MixArgs = {
        ...mixinArgs,
        touchTip: true,
        aspirateDelaySeconds: 10,
        dispenseDelaySeconds: 12,
        blowoutLocation: blowoutLabwareId,
        volume,
        times,
        changeTip: 'always',
        wells: ['A1', 'B1', 'C1'],
        yOffset: 1,
      } as MixArgs
      const mockWellLocationCustomXY: Partial<AspDispAirgapParams> = {
        wellLocation: {
          origin: 'bottom',
          offset: { x: 0, y: 1, z: 3.2 },
        },
      }

      const result = mix(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)

      expect(res.commands).toEqual(
        flatMap(args.wells, (well, idx) => [
          ...replaceTipCommands(idx),
          aspirateHelper(well, volume, mockWellLocationCustomXY),
          delayCommand(10),
          dispenseHelper(well, volume, mockWellLocationCustomXY),
          delayCommand(12),
          aspirateHelper(well, volume, mockWellLocationCustomXY),
          delayCommand(10),
          dispenseHelper(well, volume, mockWellLocationCustomXY),
          delayCommand(12),
          blowoutHelper(blowoutLabwareId, {
            wellLocation: {
              origin: 'top',
              offset: {
                z: BLOWOUT_OFFSET_ANY,
              },
            },
          }),
          touchTipHelper(well),
        ])
      )
      expect(res.python).toBe(
        `
mockPythonName.drop_tip()
mockPythonName.pick_up_tip(location=mockPythonName)
mockPythonName.aspirate(
    volume=8,
    location=mockPythonName["A1"].bottom(z=3.2).move(types.Point(y=1)),
    rate=2.1 / mockPythonName.flow_rate.aspirate,
)
protocol.delay(seconds=10)
mockPythonName.dispense(
    volume=8,
    location=mockPythonName["A1"].bottom(z=3.2).move(types.Point(y=1)),
    rate=2.2 / mockPythonName.flow_rate.dispense,
)
protocol.delay(seconds=12)
mockPythonName.aspirate(
    volume=8,
    location=mockPythonName["A1"].bottom(z=3.2).move(types.Point(y=1)),
    rate=2.1 / mockPythonName.flow_rate.aspirate,
)
protocol.delay(seconds=10)
mockPythonName.dispense(
    volume=8,
    location=mockPythonName["A1"].bottom(z=3.2).move(types.Point(y=1)),
    rate=2.2 / mockPythonName.flow_rate.dispense,
)
protocol.delay(seconds=12)
mockPythonName.flow_rate.blow_out = 2.3
mockPythonName.blow_out(mockPythonName["A1"].top(z=3.3))
mockPythonName.touch_tip(mockPythonName["A1"], v_offset=-3.4)
mockPythonName.drop_tip()
mockPythonName.pick_up_tip(location=mockPythonName)
mockPythonName.aspirate(
    volume=8,
    location=mockPythonName["B1"].bottom(z=3.2).move(types.Point(y=1)),
    rate=2.1 / mockPythonName.flow_rate.aspirate,
)
protocol.delay(seconds=10)
mockPythonName.dispense(
    volume=8,
    location=mockPythonName["B1"].bottom(z=3.2).move(types.Point(y=1)),
    rate=2.2 / mockPythonName.flow_rate.dispense,
)
protocol.delay(seconds=12)
mockPythonName.aspirate(
    volume=8,
    location=mockPythonName["B1"].bottom(z=3.2).move(types.Point(y=1)),
    rate=2.1 / mockPythonName.flow_rate.aspirate,
)
protocol.delay(seconds=10)
mockPythonName.dispense(
    volume=8,
    location=mockPythonName["B1"].bottom(z=3.2).move(types.Point(y=1)),
    rate=2.2 / mockPythonName.flow_rate.dispense,
)
protocol.delay(seconds=12)
mockPythonName.flow_rate.blow_out = 2.3
mockPythonName.blow_out(mockPythonName["A1"].top(z=3.3))
mockPythonName.touch_tip(mockPythonName["B1"], v_offset=-3.4)
mockPythonName.drop_tip()
mockPythonName.pick_up_tip(location=mockPythonName)
mockPythonName.aspirate(
    volume=8,
    location=mockPythonName["C1"].bottom(z=3.2).move(types.Point(y=1)),
    rate=2.1 / mockPythonName.flow_rate.aspirate,
)
protocol.delay(seconds=10)
mockPythonName.dispense(
    volume=8,
    location=mockPythonName["C1"].bottom(z=3.2).move(types.Point(y=1)),
    rate=2.2 / mockPythonName.flow_rate.dispense,
)
protocol.delay(seconds=12)
mockPythonName.aspirate(
    volume=8,
    location=mockPythonName["C1"].bottom(z=3.2).move(types.Point(y=1)),
    rate=2.1 / mockPythonName.flow_rate.aspirate,
)
protocol.delay(seconds=10)
mockPythonName.dispense(
    volume=8,
    location=mockPythonName["C1"].bottom(z=3.2).move(types.Point(y=1)),
    rate=2.2 / mockPythonName.flow_rate.dispense,
)
protocol.delay(seconds=12)
mockPythonName.flow_rate.blow_out = 2.3
mockPythonName.blow_out(mockPythonName["A1"].top(z=3.3))
mockPythonName.touch_tip(mockPythonName["C1"], v_offset=-3.4)`.trimStart()
      )
    })
  })
  it('should create python commands with mix() with touchTip and blowOut and no delay or x/y offset set', () => {
    const args: MixArgs = {
      ...mixinArgs,
      touchTip: true,
      blowoutLocation: blowoutLabwareId,
      volume,
      times,
      changeTip: 'always',
      wells: ['A1', 'B1', 'C1'],
      xOffset: 1,
      yOffset: 1,
    } as MixArgs

    const result = mix(args, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)

    expect(res.python).toBe(
      `
mockPythonName.drop_tip()
mockPythonName.pick_up_tip(location=mockPythonName)
mockPythonName.flow_rate.aspirate = 2.1
mockPythonName.flow_rate.dispense = 2.2
mockPythonName.mix(
    repetitions=2,
    volume=8,
    location=mockPythonName["A1"].bottom(z=3.2).move(types.Point(x=1, y=1)),
)
mockPythonName.flow_rate.blow_out = 2.3
mockPythonName.blow_out(mockPythonName["A1"].top(z=3.3))
mockPythonName.touch_tip(mockPythonName["A1"], v_offset=-3.4)
mockPythonName.drop_tip()
mockPythonName.pick_up_tip(location=mockPythonName)
mockPythonName.flow_rate.aspirate = 2.1
mockPythonName.flow_rate.dispense = 2.2
mockPythonName.mix(
    repetitions=2,
    volume=8,
    location=mockPythonName["B1"].bottom(z=3.2).move(types.Point(x=1, y=1)),
)
mockPythonName.flow_rate.blow_out = 2.3
mockPythonName.blow_out(mockPythonName["A1"].top(z=3.3))
mockPythonName.touch_tip(mockPythonName["B1"], v_offset=-3.4)
mockPythonName.drop_tip()
mockPythonName.pick_up_tip(location=mockPythonName)
mockPythonName.flow_rate.aspirate = 2.1
mockPythonName.flow_rate.dispense = 2.2
mockPythonName.mix(
    repetitions=2,
    volume=8,
    location=mockPythonName["C1"].bottom(z=3.2).move(types.Point(x=1, y=1)),
)
mockPythonName.flow_rate.blow_out = 2.3
mockPythonName.blow_out(mockPythonName["A1"].top(z=3.3))
mockPythonName.touch_tip(mockPythonName["C1"], v_offset=-3.4)`.trimStart()
    )
  })
})

describe('mix: errors', () => {
  let errorArgs: Partial<MixArgs>
  beforeEach(() => {
    errorArgs = {
      ...mixinArgs,
      volume: 8,
      times: 2,
      changeTip: 'once',
      wells: ['A1', 'A2'],
    }
  })
  it('invalid labware', () => {
    const args: MixArgs = {
      ...errorArgs,
      labware: 'invalidLabwareId',
    } as MixArgs
    const result = mix(args, invariantContext, robotStateWithTip)
    const res = getErrorResult(result)
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toMatchObject({
      type: 'LABWARE_DOES_NOT_EXIST',
    })
  })

  it('invalid pipette', () => {
    const args: MixArgs = {
      ...errorArgs,
      pipette: 'invalidPipetteId',
    } as MixArgs
    const result = mix(args, invariantContext, robotStateWithTip)
    const res = getErrorResult(result)
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toMatchObject({
      type: 'PIPETTE_DOES_NOT_EXIST',
    })
  })

  // TODO Ian 2018-05-08
  it.todo('"times" arg non-integer')
  it.todo('"times" arg negative')
})
