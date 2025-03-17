import { beforeEach, describe, it, expect, afterEach, vi } from 'vitest'
import {
  HEATERSHAKER_MODULE_TYPE,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'
import {
  getInitialRobotStateStandard,
  getInitialRobotStateWithOffDeckLabwareStandard,
  makeContext,
  getSuccessResult,
  getErrorResult,
  getStateAndContextTempTCModules,
  SOURCE_LABWARE,
  TIPRACK_1,
} from '../fixtures'
import { moveLabware } from '..'

import type {
  LabwareDefinition2,
  MoveLabwareParams,
} from '@opentrons/shared-data'
import type { InvariantContext, RobotState } from '../types'

const mockWasteChuteId = 'mockWasteChuteId'
const mockGripperId = 'mockGripperId'

describe('moveLabware', () => {
  let robotState: RobotState
  let invariantContext: InvariantContext
  beforeEach(() => {
    invariantContext = makeContext()
    robotState = getInitialRobotStateStandard(invariantContext)

    invariantContext = {
      ...invariantContext,
      additionalEquipmentEntities: {
        mockGripperId: {
          name: 'gripper',
          id: mockGripperId,
        },
      },
    }
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('should return a moveLabware command for manualMoveWithPause given only the required params', () => {
    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'manualMoveWithPause',
      newLocation: { slotName: 'A1' },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'moveLabware',
        key: expect.any(String),
        params: {
          labwareId: SOURCE_LABWARE,
          strategy: 'manualMoveWithPause',
          newLocation: { slotName: 'A1' },
        },
      },
    ])
  })
  it('should return a moveLabware command for moving with a gripper given only the required params', () => {
    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: { slotName: 'A1' },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'moveLabware',
        key: expect.any(String),
        params: {
          labwareId: SOURCE_LABWARE,
          strategy: 'usingGripper',
          newLocation: { slotName: 'A1' },
        },
      },
    ])
  })
  it('should return an error for labware does not exist with bad labwareid', () => {
    const params = {
      labwareId: 'badLabware',
      strategy: 'usingGripper',
      newLocation: { slotName: 'A1' },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'LABWARE_DOES_NOT_EXIST',
    })
  })
  it('should return an error for trying to move the labware back onto deck when off deck currently with gripper', () => {
    robotState = getInitialRobotStateWithOffDeckLabwareStandard(
      invariantContext
    )
    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: { slotName: 'A1' },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'LABWARE_OFF_DECK',
    })
  })
  it('should return an error for trying to move the labware to an occupied slot', () => {
    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: { slotName: '1' },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'LABWARE_ON_ANOTHER_ENTITY',
    })
  })
  it('should return an error for trying to move the labware to an occupied module', () => {
    const state = getInitialRobotStateStandard(invariantContext)
    const HEATER_SHAKER_ID = 'heaterShakerId'
    const HEATER_SHAKER_SLOT = 'A1'

    robotState = {
      ...state,
      modules: {
        ...state.modules,
        [HEATER_SHAKER_ID]: {
          slot: HEATER_SHAKER_SLOT,
          moduleState: {
            type: HEATERSHAKER_MODULE_TYPE,
            latchOpen: true,
            targetSpeed: null,
          },
        } as any,
      },
      labware: {
        ...state.labware,
        mockLabwareId: {
          slot: HEATER_SHAKER_ID,
        },
      },
    }
    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: { moduleId: HEATER_SHAKER_ID },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'LABWARE_ON_ANOTHER_ENTITY',
    })
  })
  it('should return an error for the labware already being discarded in previous step', () => {
    const wasteChuteInvariantContext = {
      ...invariantContext,
      additionalEquipmentEntities: {
        ...invariantContext.additionalEquipmentEntities,
        mockWasteChuteId: {
          name: 'wasteChute',
          id: mockWasteChuteId,
          location: WASTE_CHUTE_CUTOUT,
        },
      },
    } as InvariantContext

    robotState.labware = {
      [SOURCE_LABWARE]: { slot: 'gripperWasteChute' },
    }
    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: { slotName: 'A1' },
    } as MoveLabwareParams

    const result = moveLabware(params, wasteChuteInvariantContext, robotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'LABWARE_DISCARDED_IN_WASTE_CHUTE',
    })
  })
  it('should return an error for trying to move the labware off deck with a gripper', () => {
    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: 'offDeck',
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'LABWARE_OFF_DECK',
    })
  })
  it('should return an error for trying to move an aluminum block with a gripper', () => {
    const aluminumBlockDef = ({
      metadata: { displayCategory: 'aluminumBlock' },
    } as any) as LabwareDefinition2

    invariantContext = {
      ...invariantContext,
      additionalEquipmentEntities: {
        mockGripperId: {
          name: 'gripper',
          id: mockGripperId,
        },
      },
      labwareEntities: {
        [SOURCE_LABWARE]: {
          id: 'labwareid',
          labwareDefURI: 'mockDefUri',
          def: aluminumBlockDef,
        },
      },
    }

    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: { slotName: 'A1' },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'CANNOT_MOVE_WITH_GRIPPER',
    })
  })
  it('should return an error when trying to move labware to the thermocycler when lid is closed', () => {
    const temperatureModuleId = 'temperatureModuleId'
    const thermocyclerId = 'thermocyclerId'

    const stateAndContext = getStateAndContextTempTCModules({
      temperatureModuleId,
      thermocyclerId,
    })
    const tcInvariantContext = stateAndContext.invariantContext
    const tcRobotState = stateAndContext.robotState

    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'manualMoveWithPause',
      newLocation: { moduleId: thermocyclerId },
    } as MoveLabwareParams

    const result = moveLabware(params, tcInvariantContext, tcRobotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'THERMOCYCLER_LID_CLOSED',
    })
  })
  it('should return an error when trying to move labware to the heater-shaker when its latch is closed', () => {
    const state = getInitialRobotStateStandard(invariantContext)
    const HEATER_SHAKER_ID = 'heaterShakerId'
    const HEATER_SHAKER_SLOT = 'A1'

    robotState = {
      ...state,
      modules: {
        ...state.modules,
        [HEATER_SHAKER_ID]: {
          slot: HEATER_SHAKER_SLOT,
          moduleState: {
            type: HEATERSHAKER_MODULE_TYPE,
            latchOpen: false,
            targetSpeed: null,
          },
        } as any,
      },
    }
    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: { moduleId: HEATER_SHAKER_ID },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_LATCH_CLOSED',
    })
  })
  it('should return an error when trying to move labware to an adapter on the heater-shaker when its latch is closed', () => {
    const state = getInitialRobotStateStandard(invariantContext)
    const HEATER_SHAKER_ID = 'heaterShakerId'
    const HEATER_SHAKER_SLOT = 'A1'
    const ADAPTER_ID = 'adapterId'

    robotState = {
      ...state,
      labware: {
        ...state.labware,
        [ADAPTER_ID]: {
          slot: HEATER_SHAKER_ID,
        },
      },
      modules: {
        ...state.modules,
        [HEATER_SHAKER_ID]: {
          slot: HEATER_SHAKER_SLOT,
          moduleState: {
            type: HEATERSHAKER_MODULE_TYPE,
            latchOpen: false,
            targetSpeed: null,
          },
        } as any,
      },
    }
    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: { labwareId: ADAPTER_ID },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_LATCH_CLOSED',
    })
  })
  it('should return an error when trying to move labware to the heater-shaker when its shaking', () => {
    const state = getInitialRobotStateStandard(invariantContext)
    const HEATER_SHAKER_ID = 'heaterShakerId'
    const HEATER_SHAKER_SLOT = 'A1'

    robotState = {
      ...state,
      modules: {
        ...state.modules,
        [HEATER_SHAKER_ID]: {
          slot: HEATER_SHAKER_SLOT,
          moduleState: {
            type: HEATERSHAKER_MODULE_TYPE,
            latchOpen: true,
            targetSpeed: 400,
          },
        } as any,
      },
    }
    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: { moduleId: HEATER_SHAKER_ID },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_IS_SHAKING',
    })
  })
  it('should return a warning for if you try to move a tiprack with tips into the waste chute', () => {
    const wasteChuteInvariantContext = {
      ...invariantContext,
      additionalEquipmentEntities: {
        ...invariantContext.additionalEquipmentEntities,
        mockWasteChuteId: {
          name: 'wasteChute',
          id: mockWasteChuteId,
          location: WASTE_CHUTE_CUTOUT,
        },
      },
    } as InvariantContext

    const robotStateWithTip = ({
      ...robotState,
      tipState: {
        tipracks: {
          tiprack1Id: { A1: true },
        },
        pipettes: {
          p10SingleId: false,
        },
      },
    } as any) as RobotState
    const params = {
      labwareId: TIPRACK_1,
      strategy: 'usingGripper',
      newLocation: { addressableAreaName: 'gripperWasteChute' },
    } as MoveLabwareParams

    const result = moveLabware(
      params,
      wasteChuteInvariantContext,
      robotStateWithTip
    )
    expect(result.warnings).toEqual([
      {
        message: 'Disposing unused tips',
        type: 'TIPRACK_IN_WASTE_CHUTE_HAS_TIPS',
      },
    ])
  })
  it('should return a warning for if you try to move a labware with liquids into the waste chute', () => {
    const wasteChuteInvariantContext = {
      ...invariantContext,
      additionalEquipmentEntities: {
        ...invariantContext.additionalEquipmentEntities,
        mockWasteChuteId: {
          name: 'wasteChute',
          id: mockWasteChuteId,
          location: WASTE_CHUTE_CUTOUT,
        },
      },
    } as InvariantContext
    const robotStateWithLiquid = ({
      ...robotState,
      liquidState: {
        labware: {
          sourcePlateId: { A1: { ingredGroup: { volume: 10 } } },
        },
      },
    } as any) as RobotState
    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: { addressableAreaName: 'gripperWasteChute' },
    } as MoveLabwareParams

    const result = moveLabware(
      params,
      wasteChuteInvariantContext,
      robotStateWithLiquid
    )
    expect(result.warnings).toEqual([
      {
        message: 'Disposing of a labware with liquid',
        type: 'LABWARE_IN_WASTE_CHUTE_HAS_LIQUID',
      },
    ])
  })
  it('should return an error when trying to move with gripper when there is no gripper', () => {
    invariantContext = {
      ...invariantContext,
      additionalEquipmentEntities: {},
    } as InvariantContext

    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: { slotName: 'A1' },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'GRIPPER_REQUIRED',
    })
  })
  it('should return an error when trying to move into the waste chute when useGripper is not selected', () => {
    invariantContext = {
      ...invariantContext,
      additionalEquipmentEntities: {
        ...invariantContext.additionalEquipmentEntities,
        mockWasteChuteId: {
          name: 'wasteChute',
          id: mockWasteChuteId,
          location: WASTE_CHUTE_CUTOUT,
        },
      },
    } as InvariantContext

    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'manualMoveWithPause',
      newLocation: { addressableAreaName: 'gripperWasteChute' },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotState)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'GRIPPER_REQUIRED',
    })
  })
  it('should return an error when trying to move a labware with the gripper when a pipette has a tip on it still', () => {
    const robotStateWithTipOnPip = ({
      ...robotState,
      tipState: {
        tipracks: {
          tiprack1Id: { A1: true },
        },
        pipettes: {
          p10SingleId: true,
        },
      },
    } as any) as RobotState

    const params = {
      labwareId: SOURCE_LABWARE,
      strategy: 'usingGripper',
      newLocation: { addressableAreaName: 'gripperWasteChute' },
    } as MoveLabwareParams

    const result = moveLabware(params, invariantContext, robotStateWithTipOnPip)
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'PIPETTE_HAS_TIP',
    })
  })
})
