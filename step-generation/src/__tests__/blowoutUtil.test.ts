import { beforeEach, describe, it, expect, vi } from 'vitest'
import {
  blowoutUtil,
  SOURCE_WELL_BLOWOUT_DESTINATION,
  DEST_WELL_BLOWOUT_DESTINATION,
} from '../utils'
import { blowout } from '../commandCreators/atomic'
import { blowOutInWasteChute } from '../commandCreators/compound'
import { curryCommandCreator } from '../utils/curryCommandCreator'
import {
  DEFAULT_PIPETTE,
  SOURCE_LABWARE,
  DEST_LABWARE,
  TROUGH_LABWARE,
  BLOWOUT_FLOW_RATE,
  BLOWOUT_OFFSET_FROM_TOP_MM,
  makeContext,
  getInitialRobotStateStandard,
} from '../fixtures'
import type { RobotState, InvariantContext } from '../types'
import type { BlowoutParams } from '@opentrons/shared-data'

vi.mock('../utils/curryCommandCreator')

let blowoutArgs: {
  pipette: BlowoutParams['pipetteId']
  sourceLabwareId: string
  sourceWell: BlowoutParams['wellName']
  destLabwareId: string
  destWell: BlowoutParams['wellName']
  blowoutLocation: string | null | undefined
  flowRate: number
  offsetFromTopMm: number
  invariantContext: InvariantContext
  prevRobotState: RobotState
}
describe('blowoutUtil', () => {
  let invariantContext: InvariantContext

  beforeEach(() => {
    invariantContext = makeContext()

    blowoutArgs = {
      pipette: DEFAULT_PIPETTE,
      sourceLabwareId: SOURCE_LABWARE,
      sourceWell: 'A1',
      destLabwareId: DEST_LABWARE,
      destWell: 'A2',
      flowRate: BLOWOUT_FLOW_RATE,
      offsetFromTopMm: BLOWOUT_OFFSET_FROM_TOP_MM,
      invariantContext,
      blowoutLocation: null,
      prevRobotState: getInitialRobotStateStandard(invariantContext),
    }
    vi.mocked(curryCommandCreator).mockClear()
  })
  it('blowoutUtil curries blowout with source well params', () => {
    blowoutUtil({
      ...blowoutArgs,
      blowoutLocation: SOURCE_WELL_BLOWOUT_DESTINATION,
    })
    expect(curryCommandCreator).toHaveBeenCalledWith(blowout, {
      pipetteId: blowoutArgs.pipette,
      labwareId: blowoutArgs.sourceLabwareId,
      wellName: blowoutArgs.sourceWell,
      flowRate: blowoutArgs.flowRate,
      wellLocation: {
        origin: 'top',
        offset: {
          z: expect.any(Number),
        },
      },
    })
  })
  it('blowoutUtil curries waste chute commands when there is no well', () => {
    const wasteChuteId = 'wasteChuteId'
    invariantContext = {
      ...invariantContext,
      additionalEquipmentEntities: {
        [wasteChuteId]: {
          id: wasteChuteId,
          name: 'wasteChute',
          location: 'cutoutD3',
        },
      },
    }
    blowoutUtil({
      ...blowoutArgs,
      destLabwareId: wasteChuteId,
      invariantContext: invariantContext,
      destWell: null,
      blowoutLocation: wasteChuteId,
    })
    expect(curryCommandCreator).toHaveBeenCalledWith(blowOutInWasteChute, {
      pipetteId: blowoutArgs.pipette,
      flowRate: 2.3,
    })
  })
  it('blowoutUtil curries blowout with dest plate params', () => {
    blowoutUtil({
      ...blowoutArgs,
      blowoutLocation: DEST_WELL_BLOWOUT_DESTINATION,
    })
    expect(curryCommandCreator).toHaveBeenCalledWith(blowout, {
      pipetteId: blowoutArgs.pipette,
      labwareId: blowoutArgs.destLabwareId,
      wellName: blowoutArgs.destWell,
      flowRate: blowoutArgs.flowRate,
      wellLocation: {
        origin: 'top',
        offset: {
          z: expect.any(Number),
        },
      },
    })
  })
  it('blowoutUtil curries blowout with an arbitrary labware Id', () => {
    blowoutUtil({
      ...blowoutArgs,
      blowoutLocation: TROUGH_LABWARE,
    })
    expect(curryCommandCreator).toHaveBeenCalledWith(blowout, {
      pipetteId: blowoutArgs.pipette,
      labwareId: TROUGH_LABWARE,
      wellName: 'A1',
      flowRate: blowoutArgs.flowRate,
      wellLocation: {
        origin: 'top',
        offset: {
          z: expect.any(Number),
        },
      },
    })
  })
  it('blowoutUtil returns an empty array if not given a blowoutLocation', () => {
    const result = blowoutUtil({
      ...blowoutArgs,
      blowoutLocation: null,
    })
    expect(curryCommandCreator).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })
})
