import { beforeEach, describe, it, expect } from 'vitest'
import {
  makeContext,
  getRobotStateWithTipStandard,
  getSuccessResult,
  SOURCE_LABWARE,
  DEST_LABWARE,
} from '../fixtures'
import { airGapInWell } from '../commandCreators/compound'
import type { RobotState, InvariantContext } from '../types'

describe('airGapInWell', () => {
  let invariantContext: InvariantContext
  let robotStateWithTip: RobotState

  beforeEach(() => {
    invariantContext = makeContext()
    robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
  })
  it('air gap in 1 well for transfer', () => {
    const args = {
      flowRate: 10,
      offsetFromBottomMm: 1,
      pipetteId: 'p10SingleId',
      volume: 10,
      labwareId: SOURCE_LABWARE,
      wellName: 'B1',
    }

    const result = airGapInWell(args, invariantContext, robotStateWithTip)
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
              z: 1,
            },
            origin: 'bottom',
          },
          wellName: 'B1',
        },
      },
      {
        commandType: 'prepareToAspirate',
        key: expect.any(String),
        params: {
          pipetteId: 'p10SingleId',
        },
      },
      {
        commandType: 'airGapInPlace',
        key: expect.any(String),
        params: {
          flowRate: 10,
          pipetteId: 'p10SingleId',
          volume: 10,
        },
      },
    ])
  })
  it('air gap for multi wells for consolidate', () => {
    const args = {
      labwareId: DEST_LABWARE,
      wellName: 'A1',
      flowRate: 10,
      offsetFromBottomMm: 1,
      pipetteId: 'p10SingleId',
      volume: 10,
    }

    const result = airGapInWell(args, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'moveToWell',
        key: expect.any(String),
        params: {
          labwareId: 'destPlateId',
          pipetteId: 'p10SingleId',
          wellLocation: {
            offset: {
              x: 0,
              y: 0,
              z: 1,
            },
            origin: 'bottom',
          },
          wellName: 'A1',
        },
      },
      {
        commandType: 'prepareToAspirate',
        key: expect.any(String),
        params: {
          pipetteId: 'p10SingleId',
        },
      },
      {
        commandType: 'airGapInPlace',
        key: expect.any(String),
        params: {
          flowRate: 10,
          pipetteId: 'p10SingleId',
          volume: 10,
        },
      },
    ])
  })
})
