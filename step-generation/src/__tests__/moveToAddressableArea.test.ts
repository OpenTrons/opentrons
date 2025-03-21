import { describe, it, expect } from 'vitest'
import { getSuccessResult } from '../fixtures'
import { moveToAddressableArea } from '../commandCreators/atomic'

const getRobotInitialState = (): any => {
  return {}
}
const mockId = 'mockId'
const invariantContext: any = {
  pipetteEntities: {
    [mockId]: {
      name: 'p50_single_flex',
      id: mockId,
    },
  },
}

describe('moveToAddressableArea', () => {
  it('should call moveToAddressableArea with correct params', () => {
    const robotInitialState = getRobotInitialState()
    const mockName = '1ChannelWasteChute'
    const result = moveToAddressableArea(
      {
        pipetteId: mockId,
        addressableAreaName: mockName,
        offset: { x: 0, y: 0, z: 0 },
      },
      invariantContext,
      robotInitialState
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'moveToAddressableArea',
        key: expect.any(String),
        params: {
          pipetteId: mockId,
          addressableAreaName: mockName,
          offset: { x: 0, y: 0, z: 0 },
        },
      },
    ])
  })
})
