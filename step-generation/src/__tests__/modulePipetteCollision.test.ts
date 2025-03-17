import { beforeEach, describe, it, expect } from 'vitest'
import {
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
} from '@opentrons/shared-data'
import { modulePipetteCollision } from '../utils/modulePipetteCollision'
import { getInitialRobotStateStandard, makeContext } from '../fixtures'
import type { RobotState, InvariantContext } from '../types'
let invariantContext: InvariantContext
let robotState: RobotState
let collisionArgs: {
  invariantContext: InvariantContext
  pipette: string | null | undefined
  labware: string | null | undefined
  prevRobotState: RobotState
}
beforeEach(() => {
  invariantContext = makeContext()
  invariantContext.moduleEntities.magDeckId = {
    id: 'magDeckId',
    type: MAGNETIC_MODULE_TYPE,
    model: MAGNETIC_MODULE_V1,
    pythonName: 'mockPythonName',
  }
  robotState = getInitialRobotStateStandard(invariantContext)
  robotState.labware.destPlateId.slot = '4'
  robotState.labware.tiprack1Id.slot = '10'
  robotState.modules.magDeckId = {
    slot: '1',
    moduleState: {
      type: MAGNETIC_MODULE_TYPE,
      engaged: false,
    },
  }
  collisionArgs = {
    pipette: 'p10MultiId',
    labware: 'destPlateId',
    invariantContext,
    prevRobotState: robotState,
  }
})
describe('modulePipetteCollision', () => {
  it('should return true if using a GEN1 multi pipette "north" of a GEN1 magnetic module', () => {
    expect(modulePipetteCollision(collisionArgs)).toBe(true)
  })
  it('should return false under the same conditions, if OT_PD_DISABLE_MODULE_RESTRICTIONS flag is enabled', () => {
    collisionArgs.invariantContext.config.OT_PD_DISABLE_MODULE_RESTRICTIONS = true
    expect(modulePipetteCollision(collisionArgs)).toBe(false)
  })
  it('should return false with no labware', () => {
    expect(modulePipetteCollision({ ...collisionArgs, labware: null })).toBe(
      false
    )
  })
  it('should return false with no pipette', () => {
    expect(modulePipetteCollision({ ...collisionArgs, pipette: null })).toBe(
      false
    )
  })
  it('should return false when module is GEN2', () => {
    invariantContext.moduleEntities.magDeckId.model = MAGNETIC_MODULE_V2
    expect(
      modulePipetteCollision({
        pipette: 'p10MultiId',
        labware: 'destPlateId',
        invariantContext,
        prevRobotState: robotState,
      })
    ).toBe(false)
  })
})
