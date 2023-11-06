import { getSuccessResult } from '../fixtures'
import { configureNozzleLayout } from '../commandCreators/atomic/configureNozzleLayout'

const getRobotInitialState = (): any => {
  return {}
}

const invariantContext: any = {}

describe('configureNozzleLayout', () => {
  it('should call configureNozzleLayout with correct params', () => {
    const robotInitialState = getRobotInitialState()
    const mockNozzles = 'full'
    const result = configureNozzleLayout(
      { nozzles: 'full' },
      invariantContext,
      robotInitialState
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'configureNozzleLayout',
        key: expect.any(String),
        params: {
          nozzles: mockNozzles,
        },
      },
    ])
  })
})
