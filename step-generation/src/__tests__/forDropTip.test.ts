import { makeImmutableStateUpdater } from '../__utils__'
import { FIXED_TRASH_ID } from '../constants'
import {
  makeStateArgsStandard,
  makeContext,
  makeState,
  DEFAULT_PIPETTE,
} from '../fixtures'
import { forDropTip as _forDropTip } from '../getNextRobotStateAndWarnings/forDropTip'
import { InvariantContext, RobotState } from '../types'

const forDropTip = makeImmutableStateUpdater(_forDropTip)
describe('dropTip', () => {
  let invariantContext: InvariantContext
  beforeEach(() => {
    invariantContext = makeContext()
  })

  // TODO Ian 2019-04-19: this is a ONE-OFF fixture
  function makeRobotState(args: {
    singleHasTips: boolean
    multiHasTips: boolean
  }): RobotState {
    const _robotState = makeState({
      ...makeStateArgsStandard(),
      invariantContext,
      tiprackSetting: {
        tiprack1Id: true,
      },
    })

    _robotState.tipState.pipettes.p300SingleId = args.singleHasTips
    _robotState.tipState.pipettes.p300MultiId = args.multiHasTips
    return _robotState
  }

  describe('replaceTip: single channel', () => {
    it('drop tip if there is a tip', () => {
      const prevRobotState = makeRobotState({
        singleHasTips: true,
        multiHasTips: true,
      })
      const params = {
        pipetteId: DEFAULT_PIPETTE,
        labwareId: FIXED_TRASH_ID,
        wellName: 'A1',
      }
      const result = forDropTip(params, invariantContext, prevRobotState)
      expect(result).toEqual({
        warnings: [],
        robotState: makeRobotState({
          singleHasTips: false,
          multiHasTips: true,
        }),
      })
    })
    // TODO: IL 2019-11-20
    it.todo('no tip on pipette')
  })
  describe('Multi-channel dropTip', () => {
    it('drop tip when there are tips', () => {
      const prevRobotState = makeRobotState({
        singleHasTips: true,
        multiHasTips: true,
      })
      const params = {
        pipetteId: 'p300MultiId',
        labwareId: FIXED_TRASH_ID,
        wellName: 'A1',
      }
      const result = forDropTip(params, invariantContext, prevRobotState)
      expect(result).toEqual({
        warnings: [],
        robotState: makeRobotState({
          singleHasTips: true,
          multiHasTips: false,
        }),
      })
    })
  })
  describe('liquid tracking', () => {
    it('dropTip uses full volume when transfering tip to trash', () => {
      const prevRobotState = makeRobotState({
        singleHasTips: true,
        multiHasTips: true,
      })
      const params = {
        pipetteId: 'p300MultiId',
        labwareId: FIXED_TRASH_ID,
        wellName: 'A1',
      }
      prevRobotState.liquidState.pipettes.p300MultiId['0'] = {
        ingred1: {
          volume: 150,
        },
      }
      const result = forDropTip(params, invariantContext, prevRobotState)
      expect(result).toMatchObject({
        robotState: {
          liquidState: {
            pipettes: {
              p300MultiId: {
                '0': {
                  ingred1: {
                    volume: 0,
                  },
                },
              },
            },
            labware: {
              [FIXED_TRASH_ID]: {
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
})
