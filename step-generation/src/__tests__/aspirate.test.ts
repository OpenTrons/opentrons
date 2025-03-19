import { when } from 'vitest-when'
import { beforeEach, describe, vi, it, expect, afterEach } from 'vitest'
import { expectTimelineError } from '../__utils__/testMatchers'
import { aspirate } from '../commandCreators/atomic/aspirate'
import {
  OT2_ROBOT_TYPE,
  getLabwareDefURI,
  getPipetteSpecsV2,
  fixtureTiprack10ul as tip10,
  fixtureTiprack1000ul as tip1000,
} from '@opentrons/shared-data'

import {
  pipetteIntoHeaterShakerLatchOpen,
  thermocyclerPipetteCollision,
  pipetteIntoHeaterShakerWhileShaking,
  getIsHeaterShakerEastWestWithLatchOpen,
  pipetteAdjacentHeaterShakerWhileShaking,
  getIsHeaterShakerEastWestMultiChannelPipette,
  getIsHeaterShakerNorthSouthOfNonTiprackWithMultiChannelPipette,
} from '../utils'
import {
  getInitialRobotStateStandard,
  getRobotStateWithTipStandard,
  makeContext,
  getSuccessResult,
  getErrorResult,
  DEFAULT_PIPETTE,
  SOURCE_LABWARE,
  getInitialRobotStateWithOffDeckLabwareStandard,
} from '../fixtures'
import type {
  LabwareDefinition2,
  AspDispAirgapParams,
} from '@opentrons/shared-data'
import type { InvariantContext, RobotState } from '../'

const fixtureTiprack10ul = tip10 as LabwareDefinition2
const fixtureTiprack1000ul = tip1000 as LabwareDefinition2
const FLEX_PIPETTE = 'p1000_single_flex'
const FlexPipetteNameSpecs = getPipetteSpecsV2(FLEX_PIPETTE)

vi.mock('../utils/absorbanceReaderCollision')
vi.mock('../utils/thermocyclerPipetteCollision')
vi.mock('../utils/heaterShakerCollision')

describe('aspirate', () => {
  let initialRobotState: RobotState
  let robotStateWithTip: RobotState
  let invariantContext: InvariantContext
  let flowRateAndOffsets: Partial<AspDispAirgapParams>
  beforeEach(() => {
    invariantContext = makeContext()
    initialRobotState = getInitialRobotStateStandard(invariantContext)
    robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
    flowRateAndOffsets = {
      flowRate: 6,
      wellLocation: {
        origin: 'bottom',
        offset: { z: 5, y: 0, x: 0 },
      },
    }
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('aspirate normally (with tip)', () => {
    const params = {
      ...({
        ...flowRateAndOffsets,
        pipetteId: DEFAULT_PIPETTE,
        volume: 50,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
      } as AspDispAirgapParams),
      tipRack: 'tiprack1Id',
      nozzles: null,
    }
    const result = aspirate(params, invariantContext, robotStateWithTip)
    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'aspirate',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
          flowRate: 6,
          wellLocation: {
            origin: 'bottom',
            offset: {
              x: 0,
              y: 0,
              z: 5,
            },
          },
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      `
mockPythonName.aspirate(
    volume=50,
    location=mockPythonName["A1"].bottom(z=5),
    rate=6 / mockPythonName.flow_rate.aspirate,
)`.trimStart()
    )
  })
  it('aspirate with volume > tip max volume should throw error', () => {
    invariantContext.pipetteEntities[DEFAULT_PIPETTE].tiprackDefURI = [
      getLabwareDefURI(fixtureTiprack10ul),
    ]
    invariantContext.pipetteEntities[DEFAULT_PIPETTE].tiprackLabwareDef = [
      fixtureTiprack10ul,
    ]
    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 201,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tiprack1Id',
        nozzles: null,
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'TIP_VOLUME_EXCEEDED',
    })
  })
  it('aspirate with volume > pipette max volume should throw error', () => {
    // NOTE: assigning p300 to a 1000uL tiprack is nonsense, just for this test
    invariantContext.pipetteEntities[DEFAULT_PIPETTE].tiprackDefURI = [
      getLabwareDefURI(fixtureTiprack1000ul),
    ]
    invariantContext.pipetteEntities[DEFAULT_PIPETTE].tiprackLabwareDef = [
      fixtureTiprack1000ul,
    ]
    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 301,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'PIPETTE_VOLUME_EXCEEDED',
    })
  })
  it('aspirate with invalid pipette ID should return error', () => {
    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: 'badPipette',
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      robotStateWithTip
    )
    expectTimelineError(getErrorResult(result).errors, 'PIPETTE_DOES_NOT_EXIST')
  })
  it('aspirate with no tip should return error', () => {
    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      initialRobotState
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'NO_TIP_ON_PIPETTE',
    })
  })
  it('aspirate from nonexistent labware should return error', () => {
    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: 'problemaaticLabwareId',
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'LABWARE_DOES_NOT_EXIST',
    })
  })
  it('should return an error when aspirating from labware off deck', () => {
    initialRobotState = getInitialRobotStateWithOffDeckLabwareStandard(
      invariantContext
    )

    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      initialRobotState
    )
    expect(getErrorResult(result).errors).toHaveLength(2)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'LABWARE_OFF_DECK',
    })
  })
  it('should return an error when aspirating from thermocycler with pipette collision', () => {
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
    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'THERMOCYCLER_LID_CLOSED',
    })
  })
  it('should return an error when aspirating from heaterShaker with latch opened', () => {
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
    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_LATCH_OPEN',
    })
  })
  it('should return an error when aspirating from heaterShaker with latch opened for Flex', () => {
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
    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_LATCH_OPEN',
    })
  })
  it('should return an error when aspirating from heaterShaker when it is shaking', () => {
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
    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_IS_SHAKING',
    })
  })
  it('should return an error when aspirating from heaterShaker when it is shaking for flex', () => {
    if (FlexPipetteNameSpecs != null) {
      invariantContext.pipetteEntities[
        DEFAULT_PIPETTE
      ].spec = FlexPipetteNameSpecs
    }

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
    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_IS_SHAKING',
    })
  })
  it('should return an error when aspirating east/west of a heater shaker with a multi channel pipette', () => {
    when(getIsHeaterShakerEastWestMultiChannelPipette)
      .calledWith(
        robotStateWithTip.modules,
        robotStateWithTip.labware[SOURCE_LABWARE].slot,
        expect.anything()
      )
      .thenReturn(true)

    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_EAST_WEST_MULTI_CHANNEL',
    })
  })
  it('should return an error when aspirating east/west of a heater shaker with its latch open', () => {
    when(getIsHeaterShakerEastWestWithLatchOpen)
      .calledWith(
        robotStateWithTip.modules,
        robotStateWithTip.labware[SOURCE_LABWARE].slot
      )
      .thenReturn(true)

    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_EAST_WEST_LATCH_OPEN',
    })
  })
  it('should return an error when aspirating north/south/east/west of a heater shaker while it is shaking for ot-2', () => {
    when(pipetteAdjacentHeaterShakerWhileShaking)
      .calledWith(
        robotStateWithTip.modules,
        robotStateWithTip.labware[SOURCE_LABWARE].slot,
        OT2_ROBOT_TYPE
      )
      .thenReturn(true)

    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
      },
      invariantContext,
      robotStateWithTip
    )
    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'HEATER_SHAKER_NORTH_SOUTH_EAST_WEST_SHAKING',
    })
  })
  it('should return an error when aspirating north/south of a heater shaker from a non tiprack using a multi channel pipette', () => {
    when(getIsHeaterShakerNorthSouthOfNonTiprackWithMultiChannelPipette)
      .calledWith(
        robotStateWithTip.modules,
        robotStateWithTip.labware[SOURCE_LABWARE].slot,
        expect.anything(),
        expect.anything()
      )
      .thenReturn(true)

    const result = aspirate(
      {
        ...({
          ...flowRateAndOffsets,
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
        } as AspDispAirgapParams),
        tipRack: 'tipRack',
        nozzles: null,
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
