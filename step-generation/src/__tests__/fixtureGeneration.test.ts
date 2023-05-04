import { makeContext, makeState } from '../fixtures'
import { createEmptyLiquidState } from '../utils'

describe('snapshot tests', () => {
  it('makeContext', () => {
    expect(makeContext()).toMatchSnapshot()
  })
  it('makeState', () => {
    expect(
      makeState({
        invariantContext: makeContext(),
        labwareLocations: {
          tiprack1Id: {
            slot: '1',
          },
          tiprack2Id: {
            slot: '2',
          },
          sourcePlateId: {
            slot: '4',
          },
          fixedTrash: {
            slot: '12',
          },
        },
        pipetteLocations: {
          p300SingleId: {
            mount: 'left',
          },
        },
        tiprackSetting: {
          tiprack1Id: true,
          tiprack2Id: false,
        },
      })
    ).toMatchSnapshot()
  })
  it('createEmptyLiquidState', () => {
    expect(createEmptyLiquidState(makeContext())).toMatchSnapshot()
  })
})
