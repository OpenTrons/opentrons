import { expectTimelineError } from '../__utils__/testMatchers'
import { blowout } from '../commandCreators/atomic/blowout'
import {
  makeContext,
  getInitialRobotStateStandard,
  getRobotStateWithTipStandard,
  getErrorResult,
  getSuccessResult,
  DEFAULT_PIPETTE,
  SOURCE_LABWARE,
} from '../fixtures'
import { BlowoutParams } from '@opentrons/shared-data/protocol/types/schemaV3'
import type { RobotState, InvariantContext } from '../types'
describe('blowout', () => {
  let invariantContext: InvariantContext
  let initialRobotState: RobotState
  let robotStateWithTip: RobotState
  let params: BlowoutParams
  beforeEach(() => {
    invariantContext = makeContext()
    initialRobotState = getInitialRobotStateStandard(invariantContext)
    robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
    params = {
      pipette: DEFAULT_PIPETTE,
      labware: SOURCE_LABWARE,
      well: 'A1',
      flowRate: 21.1,
      offsetFromBottomMm: 1.3,
    }
  })
  it('blowout with tip', () => {
    const result = blowout(params, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'blowout',
        params: {
          pipetteId: DEFAULT_PIPETTE,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
          flowRate: 21.1,
          wellLocation: {
            origin: 'bottom',
            offset: {
              z: 1.3,
            },
          },
        },
      },
    ])
  })
  it('blowout with invalid pipette ID should throw error', () => {
    const result = blowout(
      { ...params, pipette: 'badPipette' },
      invariantContext,
      robotStateWithTip
    )
    expectTimelineError(getErrorResult(result).errors, 'PIPETTE_DOES_NOT_EXIST')
  })
  it('blowout with invalid labware ID should throw error', () => {
    const result = blowout(
      { ...params, labware: 'badLabware' },
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
    const result = blowout(params, invariantContext, initialRobotState)
    const res = getErrorResult(result)
    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toMatchObject({
      type: 'NO_TIP_ON_PIPETTE',
    })
  })
})
