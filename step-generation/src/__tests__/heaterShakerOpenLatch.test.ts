import { when } from 'vitest-when'
import { beforeEach, describe, it, expect, afterEach, vi } from 'vitest'
import {
  getLabwareDefURI,
  getPipetteSpecsV2,
  fixtureTiprack1000ul as _fixtureTiprack1000ul,
} from '@opentrons/shared-data'
import { heaterShakerOpenLatch } from '../commandCreators/atomic/heaterShakerOpenLatch'
import { getIsTallLabwareEastWestOfHeaterShaker } from '../utils'
import {
  getErrorResult,
  getInitialRobotStateStandard,
  makeContext,
  DEFAULT_PIPETTE,
} from '../fixtures'
import type { InvariantContext, RobotState } from '../types'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

vi.mock('../utils/heaterShakerCollision')

const fixtureTiprack1000ul = _fixtureTiprack1000ul as LabwareDefinition2
const FLEX_PIPETTE = 'p1000_single_flex'
const FlexPipetteNameSpecs = getPipetteSpecsV2(FLEX_PIPETTE)

describe('heaterShakerOpenLatch', () => {
  const HEATER_SHAKER_ID = 'heaterShakerId'
  const HEATER_SHAKER_SLOT = '1'
  let robotState: RobotState
  let invariantContext: InvariantContext
  beforeEach(() => {
    const context = makeContext()
    invariantContext = {
      ...context,
      labwareEntities: {
        ...context.labwareEntities,
        tiprack2Id: {
          id: 'tiprack2Id',
          // this tiprack is tall enough to trigger the latch open warning
          labwareDefURI: getLabwareDefURI(fixtureTiprack1000ul),
          def: fixtureTiprack1000ul,
          pythonName: 'mockPythonName',
        },
      },
      moduleEntities: {
        ...context.moduleEntities,
        [HEATER_SHAKER_ID]: {
          pythonName: 'mock_heater_shaker_1',
        } as any,
      },
    }
    const state = getInitialRobotStateStandard(invariantContext)

    robotState = {
      ...state,
      modules: {
        ...state.modules,
        [HEATER_SHAKER_ID]: {
          slot: HEATER_SHAKER_SLOT,
        } as any,
      },
    }
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('should return an error when there is labware east/west that is above 53 mm', () => {
    when(getIsTallLabwareEastWestOfHeaterShaker)
      .calledWith(
        robotState.labware,
        invariantContext.labwareEntities,
        HEATER_SHAKER_SLOT
      )
      .thenReturn(true)
    const result = heaterShakerOpenLatch(
      {
        moduleId: HEATER_SHAKER_ID,
      },
      invariantContext,
      robotState
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'TALL_LABWARE_EAST_WEST_OF_HEATER_SHAKER',
    })
  })
  it('should not return an error when there is labware east/west that is above 53 mm for flex', () => {
    if (FlexPipetteNameSpecs != null) {
      invariantContext.pipetteEntities[
        DEFAULT_PIPETTE
      ].spec = FlexPipetteNameSpecs
    }
    vi.mocked(getIsTallLabwareEastWestOfHeaterShaker).mockReturnValue(false)

    const result = heaterShakerOpenLatch(
      {
        moduleId: HEATER_SHAKER_ID,
      },
      invariantContext,
      robotState
    )
    expect(result).toEqual({
      commands: [
        {
          commandType: 'heaterShaker/openLabwareLatch',
          key: expect.any(String),
          params: { moduleId: 'heaterShakerId' },
        },
      ],
      python: 'mock_heater_shaker_1.open_labware_latch()',
    })
  })
  it('should return an open latch command when there is no labware that is too tall east/west of the heater shaker', () => {
    when(getIsTallLabwareEastWestOfHeaterShaker)
      .calledWith(
        robotState.labware,
        invariantContext.labwareEntities,
        HEATER_SHAKER_SLOT
      )
      .thenReturn(false)
    const result = heaterShakerOpenLatch(
      {
        moduleId: HEATER_SHAKER_ID,
      },
      invariantContext,
      robotState
    )
    expect(result).toEqual({
      commands: [
        {
          commandType: 'heaterShaker/openLabwareLatch',
          key: expect.any(String),
          params: { moduleId: 'heaterShakerId' },
        },
      ],
      python: 'mock_heater_shaker_1.open_labware_latch()',
    })
  })
})
