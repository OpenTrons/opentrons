import { beforeEach, describe, it, expect } from 'vitest'
import {
  makeContext,
  getRobotStateWithTipStandard,
  getSuccessResult,
  SOURCE_LABWARE,
} from '../fixtures'
import { delayInWell } from '../commandCreators/compound'
import type { RobotState, InvariantContext } from '../types'

describe('delayInWell', () => {
  let invariantContext: InvariantContext
  let robotStateWithTip: RobotState

  beforeEach(() => {
    invariantContext = makeContext()
    robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
  })
  it('moves to well and delays', () => {
    const args = {
      pipetteId: 'p10SingleId',
      zOffset: 10,
      destinationId: SOURCE_LABWARE,
      well: 'B1',
      seconds: 30,
    }

    const result = delayInWell(args, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'moveToWell',
        key: expect.any(String),
        params: {
          labwareId: 'sourcePlateId',
          pipetteId: 'p10SingleId',
          wellLocation: {
            offset: {
              x: 0,
              y: 0,
              z: 10,
            },
            origin: 'bottom',
          },
          wellName: 'B1',
        },
      },
      {
        commandType: 'waitForDuration',
        key: expect.any(String),
        params: {
          seconds: 30,
        },
      },
    ])
    expect(res.python).toBe(
      `
mockPythonName.move_to(mockPythonName["B1"].bottom(z=10))
protocol.delay(seconds=30)`.trimStart()
    )
  })
})
