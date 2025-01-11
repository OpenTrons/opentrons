import { describe, it, expect } from 'vitest'
import { ALL, COLUMN, fixtureP100096V2Specs } from '@opentrons/shared-data'
import { getSuccessResult } from '../fixtures'
import { configureNozzleLayout } from '../commandCreators/atomic/configureNozzleLayout'

const getRobotInitialState = (): any => {
  return {}
}

const invariantContext: any = {
  pipetteEntities: { mockPipette: { spec: fixtureP100096V2Specs } },
}
const robotInitialState = getRobotInitialState()
const mockPipette = 'mockPipette'

describe('configureNozzleLayout', () => {
  it('should call configureNozzleLayout with correct params for full tip', () => {
    const result = configureNozzleLayout(
      { nozzles: ALL, pipetteId: mockPipette },
      invariantContext,
      robotInitialState
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'configureNozzleLayout',
        key: expect.any(String),
        params: {
          pipetteId: mockPipette,
          configurationParams: { style: ALL },
        },
      },
    ])
  })
  it('should call configureNozzleLayout with correct params for column tip', () => {
    const result = configureNozzleLayout(
      { nozzles: COLUMN, pipetteId: mockPipette },
      invariantContext,
      robotInitialState
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'configureNozzleLayout',
        key: expect.any(String),
        params: {
          pipetteId: mockPipette,
          configurationParams: { primaryNozzle: 'A12', style: COLUMN },
        },
      },
    ])
  })
})
