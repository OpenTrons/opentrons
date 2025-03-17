import { beforeEach, describe, it, expect } from 'vitest'
import cloneDeep from 'lodash/cloneDeep'
import {
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
} from '@opentrons/shared-data'
import { makeImmutableStateUpdater } from '../__utils__'
import { makeContext, getInitialRobotStateStandard } from '../fixtures'
import {
  forEngageMagnet as _forEngageMagnet,
  forDisengageMagnet as _forDisengageMagnet,
} from '../getNextRobotStateAndWarnings/magnetUpdates'
import type { InvariantContext, RobotState } from '../types'
const forEngageMagnet = makeImmutableStateUpdater(_forEngageMagnet)
const forDisengageMagnet = makeImmutableStateUpdater(_forDisengageMagnet)
const moduleId = 'magneticModuleId'
let invariantContext: InvariantContext
let disengagedRobotState: RobotState
let engagedRobotState: RobotState
beforeEach(() => {
  invariantContext = makeContext()
  invariantContext.moduleEntities[moduleId] = {
    id: moduleId,
    type: MAGNETIC_MODULE_TYPE,
    model: MAGNETIC_MODULE_V1,
    pythonName: 'mockPythonName',
  }
  disengagedRobotState = getInitialRobotStateStandard(invariantContext)
  disengagedRobotState.modules[moduleId] = {
    slot: '4',
    moduleState: {
      type: MAGNETIC_MODULE_TYPE,
      engaged: false,
    },
  }
  engagedRobotState = cloneDeep(disengagedRobotState)
  engagedRobotState.modules[moduleId].moduleState = {
    type: MAGNETIC_MODULE_TYPE,
    engaged: true,
  }
})
describe('forEngageMagnet', () => {
  it('engages magnetic module when it was unengaged', () => {
    const params = {
      moduleId,
      height: 10,
    }
    const result = forEngageMagnet(
      params,
      invariantContext,
      disengagedRobotState
    )
    expect(result).toEqual({
      robotState: engagedRobotState,
      warnings: [],
    })
  })
  it('no effect on magnetic module "engaged" state when already engaged', () => {
    const params = {
      moduleId,
      height: 11,
    }
    const result = forEngageMagnet(params, invariantContext, engagedRobotState)
    expect(result).toEqual({
      robotState: engagedRobotState,
      warnings: [],
    })
  })
})
describe('forDisengageMagnet', () => {
  it('unengages magnetic module when it was engaged', () => {
    const params = {
      moduleId,
    }
    const result = forDisengageMagnet(
      params,
      invariantContext,
      engagedRobotState
    )
    expect(result).toEqual({
      robotState: disengagedRobotState,
      warnings: [],
    })
  })
  it('no effect on magnetic module "engaged" state when already disengaged', () => {
    const params = {
      moduleId,
    }
    const result = forDisengageMagnet(
      params,
      invariantContext,
      disengagedRobotState
    )
    expect(result).toEqual({
      robotState: disengagedRobotState,
      warnings: [],
    })
  })
})
