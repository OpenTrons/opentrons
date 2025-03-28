import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest'
import {
  getRobotStateWithTipStandard,
  makeContext,
  getSuccessResult,
  DEFAULT_PIPETTE,
  TIPRACK_1,
} from '../fixtures'
import type { InvariantContext, RobotState } from '../types'
import { pickUpTip } from '../commandCreators/atomic'

describe('pickUpTip', () => {
  let robotStateWithTip: RobotState
  let invariantContext: InvariantContext
  beforeEach(() => {
    invariantContext = makeContext()
    robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('pick up tip', () => {
    const params = {
      pipetteId: DEFAULT_PIPETTE,
      labwareId: TIPRACK_1,
      wellName: 'B1',
    }
    const result = pickUpTip(params, invariantContext, robotStateWithTip)
    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'pickUpTip',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          labwareId: TIPRACK_1,
          wellName: 'B1',
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      `mockPythonName.pick_up_tip(location=mockPythonName)`
    )
  })
})
