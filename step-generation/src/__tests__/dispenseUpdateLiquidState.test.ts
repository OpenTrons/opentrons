import { beforeEach, describe, it, expect } from 'vitest'
import {
  fixture12Trough as _fixture12Trough,
  fixture96Plate as _fixture96Plate,
  fixture384Plate as _fixture384Plate,
} from '@opentrons/shared-data'
import merge from 'lodash/merge'
import omit from 'lodash/omit'
import produce from 'immer'
import { createEmptyLiquidState, createTipLiquidState } from '../utils'
import {
  makeContext,
  DEFAULT_PIPETTE,
  SOURCE_LABWARE,
  getInitialRobotStateStandard,
} from '../fixtures'
import { dispenseUpdateLiquidState } from '../getNextRobotStateAndWarnings/dispenseUpdateLiquidState'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { DispenseUpdateLiquidStateArgs } from '../getNextRobotStateAndWarnings/dispenseUpdateLiquidState'
import type { InvariantContext, RobotState } from '../types'

const fixture96Plate = _fixture96Plate as LabwareDefinition2
const fixture12Trough = _fixture12Trough as LabwareDefinition2
const fixture384Plate = _fixture384Plate as LabwareDefinition2

let dispenseSingleCh150ToA1Args: GetUpdatedLiquidStateParams
let invariantContext: InvariantContext

beforeEach(() => {
  invariantContext = makeContext()
  dispenseSingleCh150ToA1Args = {
    invariantContext,
    pipetteId: DEFAULT_PIPETTE,
    volume: 150,
    useFullVolume: false,
    labwareId: SOURCE_LABWARE,
    wellName: 'A1',
    robotStateAndWarnings: {
      robotState: getInitialRobotStateStandard(invariantContext),
      warnings: [],
    },
  }
})

type GetUpdatedLiquidStateParams = Omit<
  DispenseUpdateLiquidStateArgs,
  'prevLiquidState'
>
function getUpdatedLiquidState(
  params: GetUpdatedLiquidStateParams,
  initialLiquidState: RobotState['liquidState']
): RobotState['liquidState'] {
  return produce(initialLiquidState, draft => {
    dispenseUpdateLiquidState({
      ...params,
      prevLiquidState: draft,
    })
  })
}

describe('...single-channel pipette', () => {
  it('fully dispense single ingredient into empty well, with explicit volume', () => {
    const initialLiquidState = merge(
      {},
      createEmptyLiquidState(invariantContext),
      {
        pipettes: {
          p300SingleId: {
            '0': {
              ingred1: { volume: 150 },
            },
          },
        },
      }
    )

    const result = getUpdatedLiquidState(
      dispenseSingleCh150ToA1Args,
      initialLiquidState
    )

    expect(result).toMatchObject({
      pipettes: {
        p300SingleId: {
          '0': {
            ingred1: { volume: 0 },
          },
        },
      },
      labware: {
        sourcePlateId: {
          A1: { ingred1: { volume: 150 } },
          A2: {},
          B1: {},
        },
      },
    })
  })

  it('fully dispense single ingredient into empty well, with useFullVolume', () => {
    const initialLiquidState = merge(
      {},
      createEmptyLiquidState(invariantContext),
      {
        pipettes: {
          p300SingleId: {
            '0': {
              ingred1: { volume: 150 },
            },
          },
        },
      }
    )

    const result = getUpdatedLiquidState(
      {
        ...omit(dispenseSingleCh150ToA1Args, 'volume'),
        useFullVolume: true,
      },
      initialLiquidState
    )

    expect(result).toMatchObject({
      pipettes: {
        p300SingleId: {
          '0': {
            ingred1: { volume: 0 },
          },
        },
      },
      labware: {
        sourcePlateId: {
          A1: { ingred1: { volume: 150 } },
          A2: {},
          B1: {},
        },
      },
    })
  })

  it('dispense ingred 1 into well containing ingreds 1 & 2', () => {
    const initialLiquidState = merge(
      {},
      createEmptyLiquidState(invariantContext),
      {
        pipettes: {
          p300SingleId: {
            '0': {
              ingred1: { volume: 150 },
            },
          },
        },
        labware: {
          sourcePlateId: {
            A1: {
              ingred1: { volume: 30 },
              ingred2: { volume: 50 },
            },
          },
        },
      }
    )

    const result = getUpdatedLiquidState(
      dispenseSingleCh150ToA1Args,
      initialLiquidState
    )

    expect(result).toMatchObject({
      pipettes: {
        p300SingleId: {
          '0': {
            ingred1: { volume: 0 },
          },
        },
      },
      labware: {
        sourcePlateId: {
          A1: {
            ingred1: { volume: 150 + 30 },
            ingred2: { volume: 50 },
          },
          A2: {},
          B1: {},
        },
      },
    })
  })

  it('dispense ingred 1 & 2 into well containing 2 & 3', () => {
    const initialLiquidState = merge(
      {},
      createEmptyLiquidState(invariantContext),
      {
        pipettes: {
          p300SingleId: {
            '0': {
              ingred1: { volume: 50 },
              ingred2: { volume: 100 },
            },
          },
        },
        labware: {
          sourcePlateId: {
            A1: {
              ingred2: { volume: 25 },
              ingred3: { volume: 20 },
            },
          },
        },
      }
    )

    const result = getUpdatedLiquidState(
      dispenseSingleCh150ToA1Args,
      initialLiquidState
    )

    expect(result).toMatchObject({
      pipettes: {
        p300SingleId: {
          '0': {
            ingred1: { volume: 0 },
            ingred2: { volume: 0 },
          },
        },
      },
      labware: {
        sourcePlateId: {
          A1: {
            ingred1: { volume: 50 },
            ingred2: { volume: 100 + 25 },
            ingred3: { volume: 20 },
          },
          A2: {},
          B1: {},
        },
      },
    })
  })

  it('partially dispense ingred 1 & 2 into well containing 2 & 3', () => {
    const initialLiquidState = merge(
      {},
      createEmptyLiquidState(invariantContext),
      {
        pipettes: {
          p300SingleId: {
            '0': {
              ingred1: { volume: 50 },
              ingred2: { volume: 200 },
            },
          },
        },
        labware: {
          sourcePlateId: {
            A1: {
              ingred2: { volume: 25 },
              ingred3: { volume: 20 },
            },
          },
        },
      }
    )

    const result = getUpdatedLiquidState(
      dispenseSingleCh150ToA1Args,
      initialLiquidState
    )

    expect(result).toMatchObject({
      pipettes: {
        p300SingleId: {
          '0': {
            ingred1: { volume: 20 },
            ingred2: { volume: 80 },
          },
        },
      },
      labware: {
        sourcePlateId: {
          A1: {
            ingred1: { volume: 0 + (50 - 20) },
            ingred2: { volume: 25 + (200 - 80) },
            ingred3: { volume: 0 + 20 },
          },
          A2: {},
          B1: {},
        },
      },
    })
  })

  describe('handle air in pipette tips', () => {
    it.todo('TODO(IL 2018-03-16): deal with air (especially regarding air gap)')
  })
})

describe('...8-channel pipette', () => {
  describe('dispense into empty column with different ingreds in each tip:', () => {
    const tests = [
      {
        labwareType: 'fixture_96_plate',
        def: fixture96Plate,
        expectedLabwareMatch: {
          sourcePlateId: {
            A1: {
              ingred2: { volume: 25 + 150 },
              ingred3: { volume: 20 },
            },
            B1: {},
            C1: { ingred1: { volume: 150 } },
            D1: { ingred1: { volume: 150 } },
            E1: { ingred1: { volume: 150 } },
            F1: { ingred1: { volume: 150 } },
            G1: { ingred1: { volume: 150 } },
            H1: { ingred1: { volume: 150 } },
          },
        },
      },
      {
        labwareType: 'fixture_12_trough',
        def: fixture12Trough,
        expectedLabwareMatch: {
          sourcePlateId: {
            A1: {
              ingred1: { volume: 6 * 150 },
              ingred2: { volume: 25 + 150 },
              ingred3: { volume: 20 },
            },
            A2: {},
          },
        },
      },
      {
        labwareType: 'fixture_384_plate',
        def: fixture384Plate,
        expectedLabwareMatch: {
          sourcePlateId: {
            A1: {
              ingred2: { volume: 25 + 150 },
              ingred3: { volume: 20 },
            },
            C1: {},
            E1: { ingred1: { volume: 150 } },
            G1: { ingred1: { volume: 150 } },
            I1: { ingred1: { volume: 150 } },
            K1: { ingred1: { volume: 150 } },
            M1: { ingred1: { volume: 150 } },
            O1: { ingred1: { volume: 150 } },

            // odd rows out
            B1: {},
            D1: {},
            F1: {},
            H1: {},
            J1: {},
            L1: {},
            N1: {},
            P1: {},
          },
        },
      },
    ]

    tests.forEach(({ labwareType, def, expectedLabwareMatch }) =>
      // make sourcePlateId a different labware def each time
      it(labwareType, () => {
        const customInvariantContext = makeContext()
        customInvariantContext.labwareEntities.sourcePlateId = {
          id: SOURCE_LABWARE,
          labwareDefURI: labwareType,
          def,
          pythonName: 'mockPythonName',
        }
        const blankLiquidState = createEmptyLiquidState(customInvariantContext)
        const initialLiquidState = merge({}, blankLiquidState, {
          pipettes: {
            p300MultiId: {
              // all tips have 150uL of ingred1, except tips 0 and 1
              ...createTipLiquidState(8, { ingred1: { volume: 150 } }),
              '0': {
                ingred2: { volume: 200 },
              },
              '1': {},
            },
          },
          labware: {
            sourcePlateId: {
              A1: {
                ingred2: { volume: 25 },
                ingred3: { volume: 20 },
              },
            },
          },
        })

        const result = getUpdatedLiquidState(
          {
            invariantContext: customInvariantContext,
            labwareId: SOURCE_LABWARE,
            pipetteId: 'p300MultiId',
            useFullVolume: false,
            volume: 150,
            wellName: 'A1',
            robotStateAndWarnings: {
              robotState: getInitialRobotStateStandard(invariantContext),
              warnings: [],
            },
          },
          initialLiquidState
        )

        expect(result).toMatchObject({
          pipettes: {
            p300MultiId: {
              ...createTipLiquidState(8, { ingred1: { volume: 0 } }),
              '0': {
                ingred2: { volume: 50 },
              },
              '1': {},
            },
          },
          labware: expectedLabwareMatch,
        })
      })
    )
  })
})
