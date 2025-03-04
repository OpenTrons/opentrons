import { beforeEach, describe, it, expect } from 'vitest'
import {
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
} from '@opentrons/shared-data'
import { makeContext, getInitialRobotStateStandard } from '../fixtures'
import { engageMagnet } from '../commandCreators/atomic/engageMagnet'
import type { InvariantContext, RobotState } from '../types'

const moduleId = 'magneticModuleId'
describe('engageMagnet', () => {
  let invariantContext: InvariantContext
  let robotState: RobotState
  beforeEach(() => {
    invariantContext = makeContext()
    invariantContext.moduleEntities[moduleId] = {
      id: moduleId,
      type: MAGNETIC_MODULE_TYPE,
      model: MAGNETIC_MODULE_V1,
      pythonName: 'mock_magnetic_module_1',
    }
    robotState = getInitialRobotStateStandard(invariantContext)
    robotState.modules[moduleId] = {
      slot: '4',
      moduleState: {
        type: MAGNETIC_MODULE_TYPE,
        engaged: false,
      },
    }
  })
  it('creates engage magnet command', () => {
    const height = 2
    const result = engageMagnet(
      {
        moduleId,
        height,
      },
      invariantContext,
      robotState
    )
    expect(result).toEqual({
      commands: [
        {
          commandType: 'magneticModule/engage',
          key: expect.any(String),
          params: {
            moduleId,
            height,
          },
        },
      ],
      python: `mock_magnetic_module_1.engage(height_from_base=${height})`,
    })
  })
})
