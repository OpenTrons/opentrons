import { describe, it, expect } from 'vitest'
import {
  makeContext,
  getSuccessResult,
  getInitialRobotStateStandard,
} from '../fixtures'
import { delayInTrash } from '../commandCreators/compound'
import type { RobotState, InvariantContext } from '../types'

const mockTrashBinId = 'trashBinId'
const invariantContext: InvariantContext = {
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

describe('delayInTrash', () => {
  it('moves to waste chute and delays', () => {
    const args = {
      pipetteId: 'p10SingleId',
      destinationId: mockTrashBinId,
      seconds: 30,
    }

    const result = delayInTrash(args, invariantContext, prevRobotState)
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
