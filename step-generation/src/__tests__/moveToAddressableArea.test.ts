import { describe, it, expect } from 'vitest'
import { WASTE_CHUTE_CUTOUT } from '@opentrons/shared-data'
import {
  getSuccessResult,
  makeContext,
  getInitialRobotStateStandard,
  DEFAULT_PIPETTE,
} from '../fixtures'
import { moveToAddressableArea } from '../commandCreators/atomic'
import type { InvariantContext, RobotState } from '../types'
import type { CutoutId } from '@opentrons/shared-data'

const mockCutout = 'cutoutA3' as CutoutId
const mockTrashId = 'mockTrashId'
let invariantContext: InvariantContext = {
  ...makeContext(),
  additionalEquipmentEntities: {
    [mockTrashId]: {
      id: mockTrashId,
      name: 'trashBin',
      pythonName: 'mock_trash_bin_1',
      location: mockCutout,
    },
  },
}
const prevRobotState: RobotState = getInitialRobotStateStandard(
  invariantContext
)

describe('moveToAddressableArea', () => {
  it('should call moveToAddressableArea with correct params for trash bin', () => {
    const result = moveToAddressableArea(
      {
        pipetteId: DEFAULT_PIPETTE,
        fixtureId: mockTrashId,
        offset: { x: 0, y: 0, z: 1 },
      },
      invariantContext,
      prevRobotState
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'moveToAddressableArea',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          addressableAreaName: 'movableTrashA3',
          offset: { x: 0, y: 0, z: 1 },
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      'mockPythonName.move_to(mock_trash_bin_1)'
    )
  })
  it('should call moveToAddressableArea with correct params for waste chute', () => {
    const wasteChuteId = 'wasteChuteId'
    invariantContext = {
      ...invariantContext,
      additionalEquipmentEntities: {
        [wasteChuteId]: {
          id: wasteChuteId,
          name: 'wasteChute',
          pythonName: 'mock_waste_chute_1',
          location: WASTE_CHUTE_CUTOUT,
        },
      },
    }
    const result = moveToAddressableArea(
      {
        pipetteId: DEFAULT_PIPETTE,
        fixtureId: wasteChuteId,
        offset: { x: 0, y: 0, z: 1 },
      },
      invariantContext,
      prevRobotState
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'moveToAddressableArea',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          addressableAreaName: '1ChannelWasteChute',
          offset: { x: 0, y: 0, z: 1 },
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      'mockPythonName.move_to(mock_waste_chute_1)'
    )
  })
})
