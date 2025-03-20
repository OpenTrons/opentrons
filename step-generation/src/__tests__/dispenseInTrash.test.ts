import { describe, it, expect, vi } from 'vitest'
import {
  DEFAULT_PIPETTE,
  getInitialRobotStateStandard,
  getSuccessResult,
  makeContext,
} from '../fixtures'
import { dispenseInTrash } from '../commandCreators/compound'
import type { CutoutId } from '@opentrons/shared-data'
import type { InvariantContext, RobotState } from '../types'
import { PROTOCOL_CONTEXT_NAME } from '../utils'

vi.mock('../getNextRobotStateAndWarnings/dispenseUpdateLiquidState')

const mockCutout: CutoutId = 'cutoutA3'
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

describe('dispenseInTrash', () => {
  it('returns correct commands for dispenseInTrash in trash bin for flex', () => {
    const result = dispenseInTrash(
      {
        pipetteId: DEFAULT_PIPETTE,
        flowRate: 10,
        volume: 10,
        trashId: mockTrashId,
      },
      invariantContext,
      prevRobotState
    )
    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'moveToAddressableArea',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          addressableAreaName: 'movableTrashA3',
          offset: { x: 0, y: 0, z: 0 },
        },
      },
      {
        commandType: 'dispenseInPlace',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          volume: 10,
          flowRate: 10,
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      `
mockPythonName.dispense(
    volume=10,
    location=mock_trash_bin_1,
    rate=10 / mockPythonName.flow_rate.dispense,
)`.trimStart()
    )
  })
  it('returns correct commands for dispenseInTrash in trash bin for ot-2', () => {
    const mockFixedTrashId = 'fixedTrashId'
    invariantContext = {
      ...invariantContext,
      additionalEquipmentEntities: {
        [mockFixedTrashId]: {
          id: mockFixedTrashId,
          name: 'trashBin',
          pythonName: `${PROTOCOL_CONTEXT_NAME}.fixed_trash`,
          location: 'cutout12',
        },
      },
    }
    const result = dispenseInTrash(
      {
        pipetteId: DEFAULT_PIPETTE,
        flowRate: 10,
        volume: 10,
        trashId: mockFixedTrashId,
      },
      invariantContext,
      prevRobotState
    )
    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'moveToAddressableArea',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          addressableAreaName: 'fixedTrash',
          offset: { x: 0, y: 0, z: 0 },
        },
      },
      {
        commandType: 'dispenseInPlace',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          volume: 10,
          flowRate: 10,
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      `
mockPythonName.dispense(
    volume=10,
    location=protocol.fixed_trash,
    rate=10 / mockPythonName.flow_rate.dispense,
)`.trimStart()
    )
  })
})
