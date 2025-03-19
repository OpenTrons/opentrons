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
import type { AirGapInWellType } from '../commandCreators/compound/airGapInWell'

describe('airGapInWell', () => {
  let invariantContext: InvariantContext
  let robotStateWithTip: RobotState

  beforeEach(() => {
    invariantContext = makeContext()
    robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
  })
  it('air gap in 1 well for transfer dispense', () => {
    const args = {
      flowRate: 10,
      pipetteId: 'p10SingleId',
      volume: 10,
      labwareId: SOURCE_LABWARE,
      wellName: 'B1',
      type: 'dispense' as AirGapInWellType,
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
            origin: 'top',
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
  it('air gap for multi wells for consolidate dispense', () => {
    const args = {
      labwareId: DEST_LABWARE,
      wellName: 'A1',
      flowRate: 10,
      pipetteId: 'p10SingleId',
      volume: 10,
      type: 'dispense' as AirGapInWellType,
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
            origin: 'top',
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
  it('air gap after aspirate', () => {
    const args = {
      labwareId: DEST_LABWARE,
      wellName: 'A1',
      flowRate: 10,
      pipetteId: 'p10SingleId',
      volume: 10,
      type: 'aspirate' as AirGapInWellType,
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
            origin: 'top',
          },
          wellName: 'A1',
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
