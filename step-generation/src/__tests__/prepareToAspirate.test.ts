import { beforeEach, describe, it, expect } from 'vitest'
import {
  makeContext,
  getRobotStateWithTipStandard,
  getSuccessResult,
  DEFAULT_PIPETTE,
} from '../fixtures'
import { prepareToAspirate } from '../commandCreators/atomic'
import type { PrepareToAspirateParams } from '@opentrons/shared-data'
import type { RobotState, InvariantContext } from '../types'

describe('prepareToAspirate', () => {
  let invariantContext: InvariantContext
  let robotStateWithTip: RobotState

  beforeEach(() => {
    invariantContext = makeContext()
    robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
  })
  it('aspirate in place', () => {
    const params: PrepareToAspirateParams = {
      pipetteId: DEFAULT_PIPETTE,
    }
    const result = prepareToAspirate(
      params,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'prepareToAspirate',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
        },
      },
    ])
    expect(res.python).toBe('mockPythonName.prepare_to_aspirate()')
  })
})
