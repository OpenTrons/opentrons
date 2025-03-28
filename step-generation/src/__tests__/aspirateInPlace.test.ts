import { beforeEach, describe, it, expect } from 'vitest'
import {
  makeContext,
  getRobotStateWithTipStandard,
  getSuccessResult,
} from '../fixtures'
import { aspirateInPlace } from '../commandCreators/atomic'
import type { AspirateInPlaceParams } from '@opentrons/shared-data'
import type { RobotState, InvariantContext } from '../types'

describe('aspirateInPlace', () => {
  let invariantContext: InvariantContext
  let robotStateWithTip: RobotState

  const mockId = 'mockId'
  const mockFlowRate = 10
  const mockVolume = 10
  beforeEach(() => {
    invariantContext = makeContext()
    robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
  })
  it('aspirate in place', () => {
    const params: AspirateInPlaceParams = {
      pipetteId: mockId,
      flowRate: mockFlowRate,
      volume: mockVolume,
    }
    const result = aspirateInPlace(params, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'aspirateInPlace',
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
