import { describe, it, expect } from 'vitest'
import { ALL, COLUMN, fixtureP100096V2Specs } from '@opentrons/shared-data'
import { getSuccessResult } from '../fixtures'
import { configureNozzleLayout } from '../commandCreators/atomic/configureNozzleLayout'

const getRobotInitialState = (): any => {
  return {}
}

const mockPipette = 'mockPipette'
const invariantContext: any = {
  pipetteEntities: {
    [mockPipette]: {
      name: 'p1000_96',
      id: mockPipette,
      pythonName: 'mock_pipette',
      spec: fixtureP100096V2Specs,
    },
  },
}
const robotInitialState = getRobotInitialState()

describe('configureNozzleLayout', () => {
  it('should call configureNozzleLayout with correct params for full tip', () => {
    const result = configureNozzleLayout(
      {
        configurationParams: {
          primaryNozzle: undefined,
          style: ALL,
        },
        pipetteId: mockPipette,
      },
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
    expect(res.python).toBe(
      'mock_pipette.configure_nozzle_layout(protocol_api.ALL)'
    )
  })
  it('should call configureNozzleLayout with correct params for column tip', () => {
    const result = configureNozzleLayout(
      {
        configurationParams: {
          primaryNozzle: 'A12',
          style: COLUMN,
        },
        pipetteId: mockPipette,
      },
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
    expect(res.python).toBe(
      'mock_pipette.configure_nozzle_layout(protocol_api.COLUMN, start="A12")'
    )
  })
})
