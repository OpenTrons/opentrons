import { describe, expect, it } from 'vitest'
import { addStep } from '../actions'
import { PRESAVED_STEP_ID } from '/protocol-designer/steplist/types'

describe('addStep', () => {
  it('should dispatch an ADD_STEP action with given stepType and id = PRESAVED_STEP_ID', () => {
    const stepType = 'moveLiquid'
    expect(addStep({ stepType, robotStateTimeline: { timeline: [] } })).toEqual(
      {
        type: 'ADD_STEP',
        payload: { stepType, id: PRESAVED_STEP_ID },
        meta: { robotStateTimeline: { timeline: [] } },
      }
    )
  })
})
