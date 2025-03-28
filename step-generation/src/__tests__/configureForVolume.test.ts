import { describe, it, expect } from 'vitest'
import { getSuccessResult } from '../fixtures'
import { configureForVolume } from '../commandCreators/atomic/configureForVolume'

const getRobotInitialState = (): any => {
  return {}
}
const mockId = 'mockId'
const invariantContext: any = {
  pipetteEntities: {
    [mockId]: {
      name: 'p50_single_flex',
      id: mockId,
      pythonName: 'mock_pipette_left',
    },
  },
}

describe('configureForVolume', () => {
  it('should call configureForVolume with correct params', () => {
    const robotInitialState = getRobotInitialState()
    const mockId = 'mockId'
    const result = configureForVolume(
      { pipetteId: mockId, volume: 1 },
      invariantContext,
      robotInitialState
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'configureForVolume',
        key: expect.any(String),
        params: {
          pipetteId: mockId,
          volume: 1,
        },
      },
    ])
    expect(res.python).toBe('mock_pipette_left.configure_for_volume(1)')
  })
})
