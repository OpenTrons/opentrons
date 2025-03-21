import { describe, it, expect } from 'vitest'
import {
  makeContext,
  getSuccessResult,
  getInitialRobotStateStandard,
  SOURCE_LABWARE,
} from '../fixtures'
import { moveAndDelayLocationHelper } from '../utils'
import type { RobotState, InvariantContext } from '../types'

const mockTrashBinId = 'trashBinId'
let invariantContext: InvariantContext = {
  ...makeContext(),
  additionalEquipmentEntities: {
    [mockTrashBinId]: {
      id: mockTrashBinId,
      name: 'trashBin',
      pythonName: 'mock_trash_bin_1',
      location: 'cutoutA3',
    },
  },
}
const prevRobotState: RobotState = getInitialRobotStateStandard(
  invariantContext
)

describe('moveAndDelayLocationHelper', () => {
  it('moves to waste chute and delays', () => {
    const args = {
      pipetteId: 'p10SingleId',
      destinationId: mockTrashBinId,
      seconds: 30,
      well: null,
      zOffset: 0,
    }

    const result = moveAndDelayLocationHelper(
      args,
      invariantContext,
      prevRobotState
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'moveToAddressableArea',
        key: expect.any(String),
        params: {
          pipetteId: 'p10SingleId',
          offset: { x: 0, y: 0, z: 0 },
          addressableAreaName: 'movableTrashA3',
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
mockPythonName.move_to(mock_trash_bin_1)
protocol.delay(seconds=30)`.trimStart()
    )
  })
  it('moves to well and delays', () => {
    const args = {
      pipetteId: 'p10SingleId',
      zOffset: 10,
      destinationId: SOURCE_LABWARE,
      well: 'B1',
      seconds: 30,
    }

    const result = moveAndDelayLocationHelper(
      args,
      invariantContext,
      prevRobotState
    )
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
  it('moves to trash bin and delays', () => {
    invariantContext = {
      ...invariantContext,
      additionalEquipmentEntities: {
        [mockTrashBinId]: {
          id: mockTrashBinId,
          name: 'trashBin',
          pythonName: 'mock_trash_bin_1',
          location: 'cutoutA3',
        },
      },
    }
    const args = {
      pipetteId: 'p10SingleId',
      destinationId: mockTrashBinId,
      seconds: 30,
      well: null,
      zOffset: 0,
    }

    const result = moveAndDelayLocationHelper(
      args,
      invariantContext,
      prevRobotState
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'moveToAddressableArea',
        key: expect.any(String),
        params: {
          pipetteId: 'p10SingleId',
          offset: { x: 0, y: 0, z: 0 },
          addressableAreaName: 'movableTrashA3',
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
mockPythonName.move_to(mock_trash_bin_1)
protocol.delay(seconds=30)`.trimStart()
    )
  })
})
