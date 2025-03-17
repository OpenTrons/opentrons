import { when } from 'vitest-when'
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest'
import { OT2_ROBOT_TYPE, getPipetteSpecsV2 } from '@opentrons/shared-data'
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
  getInitialRobotStateStandard,
  getInitialRobotStateWithOffDeckLabwareStandard,
  getRobotStateWithTipStandard,
  makeContext,
  getErrorResult,
  getSuccessResult,
  DEFAULT_PIPETTE,
  SOURCE_LABWARE,
} from '../fixtures'
import { dispense } from '../commandCreators/atomic/dispense'
import type { DispenseAtomicCommandParams } from '../commandCreators/atomic/dispense'
import type { InvariantContext, RobotState } from '../types'

vi.mock('../utils/absorbanceReaderCollision')
vi.mock('../utils/thermocyclerPipetteCollision')
vi.mock('../utils/heaterShakerCollision')

const FLEX_PIPETTE = 'p1000_single_flex'
const FlexPipetteNameSpecs = getPipetteSpecsV2(FLEX_PIPETTE)

describe('dispense', () => {
  let initialRobotState: RobotState
  let robotStateWithTip: RobotState
  let invariantContext: InvariantContext
  beforeEach(() => {
    invariantContext = makeContext()
    initialRobotState = getInitialRobotStateStandard(invariantContext)
    robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  describe('tip tracking & commands:', () => {
    let params: DispenseAtomicCommandParams
    beforeEach(() => {
      params = {
        pipetteId: DEFAULT_PIPETTE,
        volume: 50,
        labwareId: SOURCE_LABWARE,
        wellName: 'A1',
        wellLocation: {
          origin: 'bottom',
          offset: { z: 5, x: 0, y: 0 },
        },
        flowRate: 6,
        tipRack: 'tiprack1Id',
        nozzles: null,
      }
    })
    it('dispense normally (with tip)', () => {
      const result = dispense(params, invariantContext, robotStateWithTip)
      expect(getSuccessResult(result).commands).toEqual([
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: DEFAULT_PIPETTE,
            volume: 50,
            labwareId: SOURCE_LABWARE,
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 5,
              },
            },
            flowRate: 6,
          },
        },
      ])
      expect(getSuccessResult(result).python).toBe(
        `
mockPythonName.dispense(
    volume=50,
    location=mockPythonName["A1"].bottom(z=5),
    rate=6 / mockPythonName.flow_rate.dispense,
)`.trimStart()
      )
    })
    it('dispensing without tip should throw error', () => {
      const result = dispense(params, invariantContext, initialRobotState)
      const res = getErrorResult(result)
      expect(res.errors).toHaveLength(1)
      expect(res.errors[0]).toMatchObject({
        type: 'NO_TIP_ON_PIPETTE',
      })
    })
    it('should return an error when dispensing from labware off deck', () => {
      initialRobotState = getInitialRobotStateWithOffDeckLabwareStandard(
        invariantContext
      )
      const result = dispense(
        {
          flowRate: 10,
          wellLocation: {
            origin: 'bottom',
            offset: { z: 5, x: 0, y: 0 },
          },
          pipetteId: DEFAULT_PIPETTE,
          volume: 50,
          labwareId: SOURCE_LABWARE,
          wellName: 'A1',
          tipRack: 'tiprack1Id',
          nozzles: null,
        },
        invariantContext,
        initialRobotState
      )
      expect(getErrorResult(result).errors).toHaveLength(2)
      expect(getErrorResult(result).errors[1]).toMatchObject({
        type: 'LABWARE_OFF_DECK',
      })
    })
    it('dispense to nonexistent labware should throw error', () => {
      const result = dispense(
        { ...params, labwareId: 'someBadLabwareId' },
        invariantContext,
        robotStateWithTip
      )
      const res = getErrorResult(result)
      expect(res.errors).toHaveLength(1)
      expect(res.errors[0]).toMatchObject({
        type: 'LABWARE_DOES_NOT_EXIST',
      })
    })
    it('should return an error when dispensing from the 4th column', () => {
      robotStateWithTip = {
        ...robotStateWithTip,
        labware: {
          [SOURCE_LABWARE]: { slot: 'A4' },
        },
      }
      const result = dispense(params, invariantContext, robotStateWithTip)
      expect(getErrorResult(result).errors).toHaveLength(1)
      expect(getErrorResult(result).errors[0]).toMatchObject({
        type: 'PIPETTING_INTO_COLUMN_4',
      })
    })
    it('should return an error when dispensing into thermocycler with pipette collision', () => {
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
      const result = dispense(params, invariantContext, robotStateWithTip)
      const res = getErrorResult(result)
      expect(res.errors).toHaveLength(1)
      expect(res.errors[0]).toMatchObject({
        type: 'THERMOCYCLER_LID_CLOSED',
      })
    })
    it('should return an error when dispensing into absorbance reader with pipette collision', () => {
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
      const result = dispense(params, invariantContext, robotStateWithTip)
      const res = getErrorResult(result)
      expect(res.errors).toHaveLength(1)
      expect(res.errors[0]).toMatchObject({
        type: 'ABSORBANCE_READER_LID_CLOSED',
      })
    })
    it('should return an error when dispensing into heater shaker with latch open', () => {
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
      const result = dispense(params, invariantContext, robotStateWithTip)
      const res = getErrorResult(result)
      expect(res.errors).toHaveLength(1)
      expect(res.errors[0]).toMatchObject({
        type: 'HEATER_SHAKER_LATCH_OPEN',
      })
    })
    it('should return an error when dispensing into heater shaker with latch open for flex', () => {
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
      const result = dispense(params, invariantContext, robotStateWithTip)
      const res = getErrorResult(result)
      expect(res.errors).toHaveLength(1)
      expect(res.errors[0]).toMatchObject({
        type: 'HEATER_SHAKER_LATCH_OPEN',
      })
    })
    it('should return an error when dispensing into heater-shaker when it is shaking', () => {
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
      const result = dispense(params, invariantContext, robotStateWithTip)
      const res = getErrorResult(result)
      expect(res.errors).toHaveLength(1)
      expect(res.errors[0]).toMatchObject({
        type: 'HEATER_SHAKER_IS_SHAKING',
      })
    })
    it('should return an error when dispensing into heater-shaker when it is shaking for flex', () => {
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
      const result = dispense(params, invariantContext, robotStateWithTip)
      const res = getErrorResult(result)
      expect(res.errors).toHaveLength(1)
      expect(res.errors[0]).toMatchObject({
        type: 'HEATER_SHAKER_IS_SHAKING',
      })
    })
    it('should return an error when dispensing east/west of a heater shaker with its latch open', () => {
      when(getIsHeaterShakerEastWestWithLatchOpen)
        .calledWith(
          robotStateWithTip.modules,
          robotStateWithTip.labware[SOURCE_LABWARE].slot
        )
        .thenReturn(true)

      const result = dispense(params, invariantContext, robotStateWithTip)
      expect(getErrorResult(result).errors).toHaveLength(1)
      expect(getErrorResult(result).errors[0]).toMatchObject({
        type: 'HEATER_SHAKER_EAST_WEST_LATCH_OPEN',
      })
    })
    it('should return an error when dispensing east/west of a heater shaker with a multi channel pipette', () => {
      when(getIsHeaterShakerEastWestMultiChannelPipette)
        .calledWith(
          robotStateWithTip.modules,
          robotStateWithTip.labware[SOURCE_LABWARE].slot,
          expect.anything()
        )
        .thenReturn(true)

      const result = dispense(params, invariantContext, robotStateWithTip)
      expect(getErrorResult(result).errors).toHaveLength(1)
      expect(getErrorResult(result).errors[0]).toMatchObject({
        type: 'HEATER_SHAKER_EAST_WEST_MULTI_CHANNEL',
      })
    })
    it('should return an error when dispensing north/south/east/west of a heater shaker while it is shaking', () => {
      when(pipetteAdjacentHeaterShakerWhileShaking)
        .calledWith(
          robotStateWithTip.modules,
          robotStateWithTip.labware[SOURCE_LABWARE].slot,
          OT2_ROBOT_TYPE
        )
        .thenReturn(true)

      const result = dispense(params, invariantContext, robotStateWithTip)
      expect(getErrorResult(result).errors).toHaveLength(1)
      expect(getErrorResult(result).errors[0]).toMatchObject({
        type: 'HEATER_SHAKER_NORTH_SOUTH_EAST_WEST_SHAKING',
      })
    })
    it('should return an error when dispensing north/south of a heater shaker into a non tiprack using a multi channel pipette', () => {
      when(getIsHeaterShakerNorthSouthOfNonTiprackWithMultiChannelPipette)
        .calledWith(
          robotStateWithTip.modules,
          robotStateWithTip.labware[SOURCE_LABWARE].slot,
          expect.anything(),
          expect.anything()
        )
        .thenReturn(true)

      const result = dispense(params, invariantContext, robotStateWithTip)
      expect(getErrorResult(result).errors).toHaveLength(1)
      expect(getErrorResult(result).errors[0]).toMatchObject({
        type: 'HEATER_SHAKER_NORTH_SOUTH__OF_NON_TIPRACK_WITH_MULTI_CHANNEL',
      })
    })
  })
})
