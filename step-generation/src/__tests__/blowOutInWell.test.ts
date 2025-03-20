import { beforeEach, describe, it, expect, vi } from 'vitest'
import { expectTimelineError } from '../__utils__/testMatchers'
import { blowOutInWell } from '../commandCreators/atomic/blowOutInWell'
import {
  makeContext,
  getInitialRobotStateStandard,
  getRobotStateWithTipStandard,
  getInitialRobotStateWithOffDeckLabwareStandard,
  getErrorResult,
  getSuccessResult,
  DEFAULT_PIPETTE,
  SOURCE_LABWARE,
} from '../fixtures'
import type { BlowoutParams } from '@opentrons/shared-data'
import type { RobotState, InvariantContext } from '../types'

vi.mock('../utils/heaterShakerCollision')

describe('blowOutInWell', () => {
  let invariantContext: InvariantContext
  let initialRobotState: RobotState
  let robotStateWithTip: RobotState
  let params: BlowoutParams
  beforeEach(() => {
    invariantContext = makeContext()
    initialRobotState = getInitialRobotStateStandard(invariantContext)
    robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
    params = {
      pipetteId: DEFAULT_PIPETTE,
      labwareId: SOURCE_LABWARE,
      wellName: 'A1',
      flowRate: 21.1,
      wellLocation: {
        origin: 'top',
        offset: {
          z: -1.3,
        },
      },
    }
  })
  it('blowout with tip', () => {
    const result = blowOutInWell(params, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'blowout',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
          flowRate: 21.1,
          wellLocation: {
            origin: 'top',
            offset: {
              z: -1.3,
            },
          },
        },
      },
    ])
    expect(res.python).toBe(
      `
mockPythonName.flow_rate.blow_out = 21.1
mockPythonName.blow_out(mockPythonName["A1"].top(z=-1.3))
`.trim()
    )
  })
  it('blowout with invalid pipette ID should throw error', () => {
    const result = blowOutInWell(
      { ...params, pipetteId: 'badPipette' },
      invariantContext,
      robotStateWithTip
    )
    expectTimelineError(getErrorResult(result).errors, 'PIPETTE_DOES_NOT_EXIST')
  })
  it('blowout with invalid labware ID should throw error', () => {
    const result = blowOutInWell(
      { ...params, labwareId: 'badLabware' },
      invariantContext,
      robotStateWithTip
    )
    const res = getErrorResult(result)
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toMatchObject({
      type: 'LABWARE_DOES_NOT_EXIST',
    })
  })
  it('blowout with no tip should throw error', () => {
    const result = blowOutInWell(params, invariantContext, initialRobotState)
    const res = getErrorResult(result)
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toMatchObject({
      type: 'NO_TIP_ON_PIPETTE',
    })
  })
  it('should return an error when blowing out from labware off deck', () => {
    initialRobotState = getInitialRobotStateWithOffDeckLabwareStandard(
      invariantContext
    )
    const result = blowOutInWell(
      {
        flowRate: 10,
        wellLocation: {
          offset: {
            z: -3,
          },
        },
        pipetteId: DEFAULT_PIPETTE,
        volume: 50,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      } as BlowoutParams,
      invariantContext,
      initialRobotState
    )
    expect(getErrorResult(result).errors).toHaveLength(2)
    expect(getErrorResult(result).errors[1]).toMatchObject({
      type: 'LABWARE_OFF_DECK',
    })
  })
})
