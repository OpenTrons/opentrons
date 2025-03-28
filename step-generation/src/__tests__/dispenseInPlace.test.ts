import { beforeEach, describe, it, expect } from 'vitest'
import {
  makeContext,
  getRobotStateWithTipStandard,
  getSuccessResult,
} from '../fixtures'
import { dispenseInPlace } from '../commandCreators/atomic'
import type { RobotState, InvariantContext } from '../types'
import type { DispenseInPlaceParams } from '@opentrons/shared-data'

describe('dispenseInPlace', () => {
  let invariantContext: InvariantContext
  let robotStateWithTip: RobotState

  const mockId = 'mockId'
  const mockFlowRate = 10
  const mockVolume = 10
  beforeEach(() => {
    invariantContext = makeContext()
    robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
  })
  it('dispense in place', () => {
    const params: DispenseInPlaceParams = {
      pipetteId: mockId,
      flowRate: mockFlowRate,
      volume: mockVolume,
    }
    const result = dispenseInPlace(params, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'dispenseInPlace',
        key: expect.any(String),
        params: {
          pipetteId: mockId,
          volume: mockVolume,
          flowRate: mockFlowRate,
        },
      },
    ])
  })
})
