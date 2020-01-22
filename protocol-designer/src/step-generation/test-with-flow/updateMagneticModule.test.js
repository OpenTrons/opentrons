// @flow
import cloneDeep from 'lodash/cloneDeep'
import { makeImmutableStateUpdater } from './utils'
import { makeContext, getInitialRobotStateStandard } from './fixtures'
import {
  forEngageMagnet as _forEngageMagnet,
  forDisengageMagnet as _forDisengageMagnet,
} from '../getNextRobotStateAndWarnings/magnetUpdates'

const forEngageMagnet = makeImmutableStateUpdater(_forEngageMagnet)
const forDisengageMagnet = makeImmutableStateUpdater(_forDisengageMagnet)
const moduleId = 'magneticModuleId'
let invariantContext
let disengagedRobotState
let engagedRobotState

beforeEach(() => {
  invariantContext = makeContext()
  invariantContext.moduleEntities[moduleId] = {
    id: moduleId,
    type: 'magdeck',
    model: 'GEN1',
  }
  disengagedRobotState = getInitialRobotStateStandard(invariantContext)
  disengagedRobotState.modules[moduleId] = {
    slot: '4',
    moduleState: { type: 'magdeck', engaged: false },
  }
  engagedRobotState = cloneDeep(disengagedRobotState)
  engagedRobotState.modules[moduleId].moduleState = {
    type: 'magdeck',
    engaged: true,
  }
})

describe('forEngageMagnet', () => {
  test('engages magnetic module when it was unengaged', () => {
    const params = { module: moduleId, engageHeight: 10 }

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

  test('no effect on magnetic module "engaged" state when already engaged', () => {
    const params = { module: moduleId, engageHeight: 11 }

    const result = forEngageMagnet(params, invariantContext, engagedRobotState)

    expect(result).toEqual({
      robotState: engagedRobotState,
      warnings: [],
    })
  })
})

describe('forDisengageMagnet', () => {
  test('unengages magnetic module when it was engaged', () => {
    const params = { module: moduleId }

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

  test('no effect on magnetic module "engaged" state when already disengaged', () => {
    const params = { module: moduleId }

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
