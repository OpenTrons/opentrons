import { dropTip } from '../commandCreators/atomic/dropTip'
import { FIXED_TRASH_ID } from '../constants'
import {
  makeStateArgsStandard,
  makeContext,
  makeState,
  getSuccessResult,
  DEFAULT_PIPETTE,
} from '../fixtures'
import type { InvariantContext, RobotState } from '../types'

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
      const result = dropTip(
        {
          pipette: DEFAULT_PIPETTE,
        },
        invariantContext,
        makeRobotState({
          singleHasTips: true,
          multiHasTips: true,
        })
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        {
          commandType: 'dropTip',
          key: expect.any(String),
          params: {
            pipetteId: DEFAULT_PIPETTE,
            labwareId: FIXED_TRASH_ID,
            wellName: 'A1',
          },
        },
      ])
    })
    it('no tip on pipette, ignore dropTip', () => {
      const initialRobotState = makeRobotState({
        singleHasTips: false,
        multiHasTips: true,
      })
      const result = dropTip(
        {
          pipette: DEFAULT_PIPETTE,
        },
        invariantContext,
        initialRobotState
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([])
    })
  })
  describe('Multi-channel dropTip', () => {
    it('drop tip if there is a tip', () => {
      const result = dropTip(
        {
          pipette: 'p300MultiId',
        },
        invariantContext,
        makeRobotState({
          singleHasTips: true,
          multiHasTips: true,
        })
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        {
          commandType: 'dropTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300MultiId',
            labwareId: FIXED_TRASH_ID,
            wellName: 'A1',
          },
        },
      ])
    })
    it('no tip on pipette, ignore dropTip', () => {
      const initialRobotState = makeRobotState({
        singleHasTips: true,
        multiHasTips: false,
      })
      const result = dropTip(
        {
          pipette: 'p300MultiId',
        },
        invariantContext,
        initialRobotState
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([])
    })
  })
})
