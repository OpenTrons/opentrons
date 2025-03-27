import { beforeEach, describe, it, expect } from 'vitest'
import {
  makeContext,
  getInitialRobotStateStandard,
  DEFAULT_PIPETTE,
  SOURCE_LABWARE,
} from '../fixtures'
import { forBlowout as _forBlowout } from '../getNextRobotStateAndWarnings/forBlowout'
import { makeImmutableStateUpdater } from '../__utils__'
import type { BlowoutParams } from '@opentrons/shared-data'
import type { InvariantContext, RobotState } from '../types'

const forBlowout = makeImmutableStateUpdater(_forBlowout)
let invariantContext: InvariantContext
let robotState: RobotState
let params: BlowoutParams
beforeEach(() => {
  invariantContext = makeContext()
  robotState = getInitialRobotStateStandard(invariantContext)
  params = {
    pipetteId: DEFAULT_PIPETTE,
    labwareId: SOURCE_LABWARE,
    wellName: 'A1',
    flowRate: 21.1,
    wellLocation: {
      origin: 'bottom',
      offset: {
        z: 1.3,
      },
    },
  }
})
describe('Blowout command', () => {
  it('blowout updates with max volume of pipette', () => {
    robotState = {
      ...robotState,
      liquidState: {
        pipettes: {
          p300SingleId: {
            '0': {
              ingred1: {
                volume: 150,
              },
            },
          },
        },
        labware: {
          sourcePlateId: {
            A1: {
              ingred1: {
                volume: 0,
              },
            },
          },
        },
        wasteChute: {} as any,
        trashBins: {} as any,
      },
    }

    const result = forBlowout(params, invariantContext, robotState)
    expect(result).toMatchObject({
      robotState: {
        liquidState: {
          pipettes: {
            p300SingleId: {
              '0': {
                ingred1: {
                  volume: 0,
                },
              },
            },
          },
          labware: {
            sourcePlateId: {
              A1: {
                ingred1: {
                  volume: 150,
                },
              },
            },
          },
        },
      },
    })
  })
})
