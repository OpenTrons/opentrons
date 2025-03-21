import { when } from 'vitest-when'
import { beforeEach, describe, it, expect, afterEach, vi } from 'vitest'
import { OT2_ROBOT_TYPE, getPipetteSpecsV2 } from '@opentrons/shared-data'
import { expectTimelineError } from '../__utils__/testMatchers'
import { moveToWell } from '../commandCreators/atomic/moveToWell'
import {
  absorbanceReaderCollision,
  thermocyclerPipetteCollision,
  pipetteIntoHeaterShakerLatchOpen,
  pipetteIntoHeaterShakerWhileShaking,
  getIsHeaterShakerEastWestWithLatchOpen,
  pipetteAdjacentHeaterShakerWhileShaking,
  getIsHeaterShakerEastWestMultiChannelPipette,
  getIsHeaterShakerNorthSouthOfNonTiprackWithMultiChannelPipette,
} from '../utils'
import {
  getRobotStateWithTipStandard,
  getInitialRobotStateWithOffDeckLabwareStandard,
  makeContext,
  getSuccessResult,
  getErrorResult,
  DEFAULT_PIPETTE,
  SOURCE_LABWARE,
} from '../fixtures'
import type { InvariantContext, RobotState } from '../types'
import type { WellOrigin } from '@opentrons/shared-data'

vi.mock('../utils/absorbanceReaderCollision')
vi.mock('../utils/thermocyclerPipetteCollision')
vi.mock('../utils/heaterShakerCollision')

const FLEX_PIPETTE = 'p1000_single_flex'
const FlexPipetteNameSpecs = getPipetteSpecsV2(FLEX_PIPETTE)

describe('moveToWell', () => {
  let robotStateWithTip: RobotState
  let invariantContext: InvariantContext
  beforeEach(() => {
    invariantContext = makeContext()
    robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('should return a moveToWell command given only the required params', () => {
    const params = {
      pipetteId: DEFAULT_PIPETTE,
      labwareId: SOURCE_LABWARE,
      wellName: 'A1',
      wellLocation: {
        origin: 'bottom' as WellOrigin,
        offset: { z: 1 },
      },
    }
    const result = moveToWell(params, invariantContext, robotStateWithTip)
    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'moveToWell',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
          wellLocation: {
            origin: 'bottom' as any,
            offset: {
              z: 1,
            },
          },
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      'mockPythonName.move_to(mockPythonName["A1"].bottom(z=1))'
    )
  })
  it('should apply the optional params to the command', () => {
    const params = {
      pipetteId: DEFAULT_PIPETTE,
      labwareId: SOURCE_LABWARE,
      wellName: 'A1',
      wellLocation: {
        origin: 'bottom' as any,
        offset: {
          x: 1,
          y: 2,
          z: 3,
        },
      },
      minimumZHeight: 5,
      forceDirect: true,
    }
    const result = moveToWell(params, invariantContext, robotStateWithTip)
    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'moveToWell',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
          wellLocation: {
            origin: 'bottom',
            offset: {
              x: 1,
              y: 2,
              z: 3,
            },
          },
          minimumZHeight: 5,
          forceDirect: true,
        },
      },
    ])
  })
  it('should return an error if pipette does not exist', () => {
    const result = moveToWell(
      {
        pipetteId: 'badPipette',
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expectTimelineError(getErrorResult(result).errors, 'PIPETTE_DOES_NOT_EXIST')
  })
  it('should return error if labware does not exist', () => {
    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: 'problematicLabwareId',
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'LABWARE_DOES_NOT_EXIST',
    })
  })
  it('should return an error when dispensing from labware off deck', () => {
    const initialRobotState = getInitialRobotStateWithOffDeckLabwareStandard(
      invariantContext
    )
    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      initialRobotState
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'LABWARE_OFF_DECK',
    })
  })
  it('should return an error when dispensing from the 4th column', () => {
    robotStateWithTip = {
      ...robotStateWithTip,
      labware: {
        [SOURCE_LABWARE]: { slot: 'A4' },
      },
    }
    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'PIPETTING_INTO_COLUMN_4',
    })
  })
  it('should return an error when moving to well in a thermocycler with pipette collision', () => {
    vi.mocked(thermocyclerPipetteCollision).mockImplementationOnce(
      (
        modules: RobotState['modules'],
        labware: RobotState['labware'],
        labwareId: string
      ) => {
        expect(modules).toBe(robotStateWithTip.modules)
        expect(labware).toBe(robotStateWithTip.labware)
        expect(labwareId).toBe(SOURCE_LABWARE)
        return true
      }
    )
    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'THERMOCYCLER_LID_CLOSED',
    })
  })
  it('should return an error when moving to well in a absorbance reader with pipette collision', () => {
    vi.mocked(absorbanceReaderCollision).mockImplementationOnce(
      (
        modules: RobotState['modules'],
        labware: RobotState['labware'],
        labwareId: string
      ) => {
        expect(modules).toBe(robotStateWithTip.modules)
        expect(labware).toBe(robotStateWithTip.labware)
        expect(labwareId).toBe(SOURCE_LABWARE)
        return true
      }
    )
    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'ABSORBANCE_READER_LID_CLOSED',
    })
  })

  it('should return an error when moving to well in a heater-shaker with latch opened', () => {
    vi.mocked(pipetteIntoHeaterShakerLatchOpen).mockImplementationOnce(
      (
        modules: RobotState['modules'],
        labware: RobotState['labware'],
        labwareId: string
      ) => {
        expect(modules).toBe(robotStateWithTip.modules)
        expect(labware).toBe(robotStateWithTip.labware)
        expect(labwareId).toBe(SOURCE_LABWARE)
        return true
      }
    )
    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_LATCH_OPEN',
    })
  })

  it('should return an error when moving to well in a heater-shaker with latch opened for flex', () => {
    if (FlexPipetteNameSpecs != null) {
      invariantContext.pipetteEntities[
        DEFAULT_PIPETTE
      ].spec = FlexPipetteNameSpecs
    }

    vi.mocked(pipetteIntoHeaterShakerLatchOpen).mockImplementationOnce(
      (
        modules: RobotState['modules'],
        labware: RobotState['labware'],
        labwareId: string
      ) => {
        expect(modules).toBe(robotStateWithTip.modules)
        expect(labware).toBe(robotStateWithTip.labware)
        expect(labwareId).toBe(SOURCE_LABWARE)
        return true
      }
    )
    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_LATCH_OPEN',
    })
  })

  it('should return an error when moving to well in a heater-shaker latch is opened but is not shaking', () => {
    vi.mocked(pipetteIntoHeaterShakerLatchOpen).mockImplementationOnce(
      (
        modules: RobotState['modules'],
        labware: RobotState['labware'],
        labwareId: string
      ) => {
        expect(modules).toBe(robotStateWithTip.modules)
        expect(labware).toBe(robotStateWithTip.labware)
        expect(labwareId).toBe(SOURCE_LABWARE)
        return true
      }
    )
    vi.mocked(pipetteIntoHeaterShakerWhileShaking).mockImplementationOnce(
      (
        modules: RobotState['modules'],
        labware: RobotState['labware'],
        labwareId: string
      ) => {
        expect(modules).toBe(robotStateWithTip.modules)
        expect(labware).toBe(robotStateWithTip.labware)
        expect(labwareId).toBe(SOURCE_LABWARE)
        return false
      }
    )

    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_LATCH_OPEN',
    })
  })

  it('should return an error when moving to well in a heater-shaker is shaking but latch is closed', () => {
    vi.mocked(pipetteIntoHeaterShakerLatchOpen).mockImplementationOnce(
      (
        modules: RobotState['modules'],
        labware: RobotState['labware'],
        labwareId: string
      ) => {
        expect(modules).toBe(robotStateWithTip.modules)
        expect(labware).toBe(robotStateWithTip.labware)
        expect(labwareId).toBe(SOURCE_LABWARE)
        return false
      }
    )
    vi.mocked(pipetteIntoHeaterShakerWhileShaking).mockImplementationOnce(
      (
        modules: RobotState['modules'],
        labware: RobotState['labware'],
        labwareId: string
      ) => {
        expect(modules).toBe(robotStateWithTip.modules)
        expect(labware).toBe(robotStateWithTip.labware)
        expect(labwareId).toBe(SOURCE_LABWARE)
        return true
      }
    )

    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_IS_SHAKING',
    })
  })

  it('should return an error when moving to well in a heater-shaker is shaking but latch is closed for flex', () => {
    if (FlexPipetteNameSpecs != null) {
      invariantContext.pipetteEntities[
        DEFAULT_PIPETTE
      ].spec = FlexPipetteNameSpecs
    }

    vi.mocked(pipetteIntoHeaterShakerLatchOpen).mockImplementationOnce(
      (
        modules: RobotState['modules'],
        labware: RobotState['labware'],
        labwareId: string
      ) => {
        expect(modules).toBe(robotStateWithTip.modules)
        expect(labware).toBe(robotStateWithTip.labware)
        expect(labwareId).toBe(SOURCE_LABWARE)
        return false
      }
    )
    vi.mocked(pipetteIntoHeaterShakerWhileShaking).mockImplementationOnce(
      (
        modules: RobotState['modules'],
        labware: RobotState['labware'],
        labwareId: string
      ) => {
        expect(modules).toBe(robotStateWithTip.modules)
        expect(labware).toBe(robotStateWithTip.labware)
        expect(labwareId).toBe(SOURCE_LABWARE)
        return true
      }
    )

    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_IS_SHAKING',
    })
  })

  //  we should never run into this because you should not be allowed to shake when the latch is opened
  it('should return 2 errors when moving to well in a heater-shaker that is shaking and latch open', () => {
    vi.mocked(pipetteIntoHeaterShakerLatchOpen).mockImplementationOnce(
      (
        modules: RobotState['modules'],
        labware: RobotState['labware'],
        labwareId: string
      ) => {
        expect(modules).toBe(robotStateWithTip.modules)
        expect(labware).toBe(robotStateWithTip.labware)
        expect(labwareId).toBe(SOURCE_LABWARE)
        return true
      }
    )
    vi.mocked(pipetteIntoHeaterShakerWhileShaking).mockImplementationOnce(
      (
        modules: RobotState['modules'],
        labware: RobotState['labware'],
        labwareId: string
      ) => {
        expect(modules).toBe(robotStateWithTip.modules)
        expect(labware).toBe(robotStateWithTip.labware)
        expect(labwareId).toBe(SOURCE_LABWARE)
        return true
      }
    )

    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(2)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_LATCH_OPEN',
    })
    expect(getErrorResult(result).errors[1]).toMatchObject({
      type: 'HEATER_SHAKER_IS_SHAKING',
    })
  })
  it('should return an error when moving to a well east/west of a heater shaker with its latch open', () => {
    when(getIsHeaterShakerEastWestWithLatchOpen)
      .calledWith(
        robotStateWithTip.modules,
        robotStateWithTip.labware[SOURCE_LABWARE].slot
      )
      .thenReturn(true)

    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_EAST_WEST_LATCH_OPEN',
    })
  })
  it('should return an error when moving to a well east/west of a heater shaker with a multi channel pipette', () => {
    when(getIsHeaterShakerEastWestMultiChannelPipette)
      .calledWith(
        robotStateWithTip.modules,
        robotStateWithTip.labware[SOURCE_LABWARE].slot,
        expect.anything()
      )
      .thenReturn(true)

    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_EAST_WEST_MULTI_CHANNEL',
    })
  })
  it('should return an error when moving to a well north/south/east/west of a heater shaker while it is shaking', () => {
    when(pipetteAdjacentHeaterShakerWhileShaking)
      .calledWith(
        robotStateWithTip.modules,
        robotStateWithTip.labware[SOURCE_LABWARE].slot,
        OT2_ROBOT_TYPE
      )
      .thenReturn(true)

    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_NORTH_SOUTH_EAST_WEST_SHAKING',
    })
  })
  it('should return an error when moving to labware north/south of a heater shaker into a non tiprack using a multi channel pipette', () => {
    when(getIsHeaterShakerNorthSouthOfNonTiprackWithMultiChannelPipette)
      .calledWith(
        robotStateWithTip.modules,
        robotStateWithTip.labware[SOURCE_LABWARE].slot,
        expect.anything(),
        expect.anything()
      )
      .thenReturn(true)

    const result = moveToWell(
      {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_NORTH_SOUTH__OF_NON_TIPRACK_WITH_MULTI_CHANNEL',
    })
  })
})
