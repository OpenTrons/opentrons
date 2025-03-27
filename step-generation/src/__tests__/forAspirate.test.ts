import { beforeEach, describe, it, expect } from 'vitest'
import {
  makeContext,
  getInitialRobotStateStandard,
  DEFAULT_PIPETTE,
  SOURCE_LABWARE,
  TROUGH_LABWARE,
} from '../fixtures'
import { AIR, createTipLiquidState } from '../utils/misc'
import { makeImmutableStateUpdater } from '../__utils__'
import { forAspirate as _forAspirate } from '../getNextRobotStateAndWarnings/forAspirate'
import * as warningCreators from '../warningCreators'
import type {
  CommandCreatorWarning,
  InvariantContext,
  RobotState,
} from '../types'
import type { AspDispAirgapParams } from '@opentrons/shared-data'

const forAspirate = makeImmutableStateUpdater(_forAspirate)

let invariantContext: InvariantContext
let robotState: RobotState
let flowRatesAndOffsets: { flowRate: number; offsetFromBottomMm: number }

beforeEach(() => {
  invariantContext = makeContext()
  robotState = getInitialRobotStateStandard(invariantContext)
  flowRatesAndOffsets = {
    flowRate: 1.23,
    offsetFromBottomMm: 4.32,
  }
})

describe('...single-channel pipette', () => {
  let aspirateSingleCh50FromA1Args: AspDispAirgapParams
  const labwareId = TROUGH_LABWARE

  beforeEach(() => {
    // NOTE: aspirate from TROUGH not sourcePlate
    aspirateSingleCh50FromA1Args = {
      ...flowRatesAndOffsets,
      labwareId,
      pipetteId: DEFAULT_PIPETTE,
      volume: 50,
      wellName: 'A1',
    }
  })
  describe('...fresh tip', () => {
    it('aspirate from single-ingredient well', () => {
      robotState = {
        ...robotState,
        liquidState: {
          labware: {
            [labwareId]: {
              A1: {
                ingred1: {
                  volume: 200,
                },
              },
              A2: {},
            },
          },
          pipettes: {
            p300SingleId: {
              '0': { ingred1: { volume: 0 } },
            },
          },
          wasteChute: {} as any,
          trashBins: {} as any,
        },
      }
      robotState.liquidState.labware[labwareId].A1 = {
        ingred1: {
          volume: 200,
        },
      }

      const result = forAspirate(
        aspirateSingleCh50FromA1Args,
        invariantContext,
        robotState
      )

      expect(result.warnings).toEqual([])
      expect(result.robotState.liquidState).toMatchObject({
        pipettes: {
          p300SingleId: {
            '0': { ingred1: { volume: 50 } },
          },
        },
        labware: {
          [labwareId]: {
            A1: { ingred1: { volume: 150 } },
            A2: {},
          },
        },
        wasteChute: {} as any,
        trashBins: {} as any,
      })
    })

    it('aspirate everything + air from a single-ingredient well', () => {
      // aspirate 300 from well with 200, leaving 100 of air
      robotState.liquidState.labware[labwareId].A1 = {
        ingred1: {
          volume: 200,
        },
      }
      const args = {
        ...aspirateSingleCh50FromA1Args,
        volume: 300,
      }

      const result = forAspirate(args, invariantContext, robotState)

      expect(result.warnings).toEqual([
        warningCreators.aspirateMoreThanWellContents(),
      ])
      expect(result.robotState.liquidState).toMatchObject({
        pipettes: {
          p300SingleId: {
            '0': { ingred1: { volume: 200 }, [AIR]: { volume: 100 } },
          },
        },
        labware: {
          [labwareId]: {
            A1: { ingred1: { volume: 0 } },
            A2: {},
          },
        },
      })
    })

    it('aspirate from two-ingredient well', () => {
      robotState.liquidState.labware[labwareId].A1 = {
        ingred1: { volume: 200 },
        ingred2: { volume: 100 },
      }
      const args = {
        ...aspirateSingleCh50FromA1Args,
        volume: 60,
      }

      const result = forAspirate(args, invariantContext, robotState)

      expect(result.warnings).toEqual([])
      expect(result.robotState.liquidState).toMatchObject({
        pipettes: {
          p300SingleId: {
            '0': { ingred1: { volume: 40 }, ingred2: { volume: 20 } },
          },
        },
        labware: {
          [labwareId]: {
            A1: {
              ingred1: { volume: 200 - 40 },
              ingred2: { volume: 100 - 20 },
            },
          },
        },
      })
    })

    it('aspirate everything + air from two-ingredient well', () => {
      robotState.liquidState.labware[labwareId].A1 = {
        ingred1: { volume: 60 },
        ingred2: { volume: 70 },
      }
      const args = {
        ...aspirateSingleCh50FromA1Args,
        volume: 150,
      }

      const result = forAspirate(args, invariantContext, robotState)

      expect(result.warnings).toEqual([
        warningCreators.aspirateMoreThanWellContents(),
      ])
      expect(result.robotState.liquidState).toMatchObject({
        pipettes: {
          p300SingleId: {
            '0': {
              ingred1: { volume: 60 },
              ingred2: { volume: 70 },
              [AIR]: { volume: 20 },
            },
          },
        },
        labware: {
          [labwareId]: {
            A1: { ingred1: { volume: 0 }, ingred2: { volume: 0 } },
          },
        },
      })
    })
  })

  describe('...tip already containing liquid', () => {
    it('aspirate from single-ingredient well', () => {
      robotState.liquidState.labware[labwareId].A1 = {
        ingred1: { volume: 200 },
      }
      robotState.liquidState.pipettes.p300SingleId['0'] = {
        ingred1: { volume: 30 },
      }

      const result = forAspirate(
        aspirateSingleCh50FromA1Args,
        invariantContext,
        robotState
      )

      expect(result.warnings).toEqual([])
      expect(result.robotState.liquidState).toMatchObject({
        pipettes: {
          p300SingleId: {
            '0': { ingred1: { volume: 30 + 50 } },
          },
        },
        labware: {
          [labwareId]: {
            A1: { ingred1: { volume: 150 } },
          },
        },
      })
    })
  })
})

describe('...8-channel pipette', () => {
  let aspirate8Ch50FromA1Args: AspDispAirgapParams
  const labwareId = SOURCE_LABWARE

  beforeEach(() => {
    aspirate8Ch50FromA1Args = {
      ...flowRatesAndOffsets,
      labwareId,
      pipetteId: 'p300MultiId',
      volume: 50,
      wellName: 'A1',
    }
  })

  it('aspirate from single-ingredient set of wells (96-flat)', () => {
    // A1 and B1 have 1 ingred of different volumes, rest of column 1 is empty
    robotState.liquidState.labware[labwareId] = {
      ...robotState.liquidState.labware[labwareId],
      A1: { ingred1: { volume: 200 } },
      B1: { ingred1: { volume: 150 } },
    }
    // all pipette tips start with 30 of ingred 1
    robotState.liquidState.pipettes.p300MultiId = createTipLiquidState(8, {
      ingred1: { volume: 30 },
    })

    const result = forAspirate(
      aspirate8Ch50FromA1Args,
      invariantContext,
      robotState
    )

    // 6 warnings for 6 empty wells
    expect(result.warnings).toEqual(
      Array(6).fill(warningCreators.aspirateFromPristineWell())
    )
    expect(result.robotState.liquidState).toMatchObject({
      pipettes: {
        p300MultiId: {
          ...createTipLiquidState(8, {
            [AIR]: { volume: 50 },
            ingred1: { volume: 30 },
          }),
          '0': { ingred1: { volume: 50 + 30 } },
          '1': { ingred1: { volume: 50 + 30 } },
        },
      },
      labware: {
        [labwareId]: {
          A1: { ingred1: { volume: 200 - 50 } },
          B1: { ingred1: { volume: 150 - 50 } },
        },
      },
    })
  })

  it('aspirate everything + air from single-ingredient wells (96-flat)', () => {
    // A1 and B1 have 1 ingred of different volumes, rest of column 1 is empty
    robotState.liquidState.labware[labwareId] = {
      ...robotState.liquidState.labware[labwareId],
      A1: { ingred1: { volume: 200 } },
      B1: { ingred1: { volume: 150 } },
    }
    const args = {
      ...aspirate8Ch50FromA1Args,
      volume: 250,
    }

    const result = forAspirate(args, invariantContext, robotState)

    // A1 and B1 over-aspirated, remaining 6 pristine
    expect(result.warnings).toEqual([
      ...Array(2).fill(warningCreators.aspirateMoreThanWellContents()),
      ...Array(6).fill(warningCreators.aspirateFromPristineWell()),
    ])
    expect(result.robotState.liquidState).toMatchObject({
      pipettes: {
        p300MultiId: {
          ...createTipLiquidState(8, { [AIR]: { volume: 250 } }),
          '0': { ingred1: { volume: 200 }, [AIR]: { volume: 50 } },
          '1': { ingred1: { volume: 150 }, [AIR]: { volume: 100 } },
        },
      },
      labware: {
        [labwareId]: {
          A1: { ingred1: { volume: 0 } },
          B1: { ingred1: { volume: 0 } },
        },
      },
    })
  })
})

describe('8-channel trough', () => {
  const labwareId = TROUGH_LABWARE
  const troughCases: Array<{
    testName: string
    initialWellContents: any
    aspirateVolume: number
    expectedWarnings: CommandCreatorWarning[]
    expectedWellContents: any
    expectedTipContents: any
  }> = [
    {
      testName: '20uLx8 from 300uL trough well',
      initialWellContents: { ingred1: { volume: 300 } },
      aspirateVolume: 20,
      expectedWarnings: [],
      expectedWellContents: { ingred1: { volume: 300 - 20 * 8 } },
      expectedTipContents: { ingred1: { volume: 20 } },
    },
    {
      testName: 'over-aspirate 50uLx8 from 300uL trough well',
      initialWellContents: { ingred1: { volume: 300 } },
      aspirateVolume: 50,
      expectedWarnings: [warningCreators.aspirateMoreThanWellContents()],
      expectedWellContents: { ingred1: { volume: 0 } },
      expectedTipContents: {
        [AIR]: { volume: 50 - 300 / 8 },
        ingred1: { volume: 300 / 8 },
      },
    },
    {
      testName: 'pristine trough',
      initialWellContents: {},
      aspirateVolume: 20,
      expectedWarnings: [warningCreators.aspirateFromPristineWell()],
      expectedWellContents: {},
      expectedTipContents: { [AIR]: { volume: 20 } },
    },
  ]
  troughCases.forEach(
    ({
      testName,
      initialWellContents,
      aspirateVolume,
      expectedTipContents,
      expectedWarnings,
      expectedWellContents,
    }) =>
      it(`aspirate from single-ingredient common well (trough-12row): ${testName}`, () => {
        robotState.liquidState.labware[labwareId] = {
          ...robotState.liquidState.labware[labwareId],
          A1: initialWellContents,
        }
        const args = {
          ...flowRatesAndOffsets,
          pipetteId: 'p300MultiId',
          wellName: 'A1',
          labwareId,
          volume: aspirateVolume,
        }

        const result = forAspirate(args, invariantContext, robotState)

        expect(result.warnings).toEqual(expectedWarnings)
        expect(result.robotState.liquidState).toMatchObject({
          pipettes: {
            p300MultiId: {
              // aspirate volume divided among the 8 tips
              ...createTipLiquidState(8, expectedTipContents),
            },
          },
          labware: {
            [labwareId]: {
              A1: expectedWellContents,
            },
          },
        })
      })
  )

  it.todo('aspirate from 384 plate starting from B row') // TODO

  it.todo('aspirating from a full 96-channel and a reservoir labware')
})
