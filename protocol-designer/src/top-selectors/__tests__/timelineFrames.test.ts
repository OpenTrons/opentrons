import { describe, it, expect } from 'vitest'
import {
  timelineFrameBeforeActiveItem,
  timelineFrameAfterActiveItem,
} from '../timelineFrames'
import {
  START_TERMINAL_ITEM_ID,
  END_TERMINAL_ITEM_ID,
  PRESAVED_STEP_ID,
} from '/protocol-designer/steplist/types'
import {
  SINGLE_STEP_SELECTION_TYPE,
  TERMINAL_ITEM_SELECTION_TYPE,
} from '/protocol-designer/ui/steps/reducers'
import type { CommandsAndRobotState } from '@opentrons/step-generation'
import type { StepIdType } from '/protocol-designer/form-types'
import type { HoverableItem } from '/protocol-designer/ui/steps/reducers'

const initialRobotState: any = 'fake initial robot state'
const initialFrame: any = {
  robotState: initialRobotState,
  commands: [],
}
const lastValidRobotState: any = 'fake last valid robot state'
const lastValidFrame: any = {
  robotState: lastValidRobotState,
  commands: [],
}
const orderedStepIds: StepIdType[] = [
  'step1',
  'step2',
  'step3',
  'step4',
  'step5',
]
describe('timelineFrameBeforeActiveItem', () => {
  describe('full timeline (no errors)', () => {
    // this should represent the full timeline, no errors in any steps
    const fullRobotStateTimeline: any = {
      timeline: ['frameA', 'frameB', 'frameC', 'frameD', 'frameE'],
    }
    const noErrorTestCases: Array<{
      title: string
      activeItem: HoverableItem | null
      expected: CommandsAndRobotState | null | string
    }> = [
      {
        title: 'should return null when there is no activeItem',
        activeItem: null,
        expected: null,
      },
      {
        title:
          'should return the correct timeline frame when the initial deck setup is active',
        activeItem: {
          selectionType: TERMINAL_ITEM_SELECTION_TYPE,
          id: START_TERMINAL_ITEM_ID,
        },
        expected: initialFrame,
      },
      {
        title:
          'should return the last timeline frame when final deck state is active',
        activeItem: {
          selectionType: TERMINAL_ITEM_SELECTION_TYPE,
          id: END_TERMINAL_ITEM_ID,
        },
        expected: lastValidFrame,
      },
      {
        title:
          'should return the last timeline frame when presaved form item is active',
        activeItem: {
          selectionType: TERMINAL_ITEM_SELECTION_TYPE,
          id: PRESAVED_STEP_ID,
        },
        expected: lastValidFrame,
      },
      {
        title:
          'should return the timeline frame before step 5 when step 5 is selected',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step5',
        },
        expected: 'frameD',
      },
    ]
    noErrorTestCases.forEach(({ title, activeItem, expected }) => {
      it(title, () => {
        const result = (timelineFrameBeforeActiveItem as any).resultFunc(
          activeItem,
          initialRobotState,
          fullRobotStateTimeline,
          lastValidRobotState,
          orderedStepIds
        )
        expect(result).toEqual(expected)
      })
    })
  })
  describe('error case (timeline trunacted due to error at step 3)', () => {
    // this should represent a timeline truncated due to error in step 3
    const truncatedRobotStateTimeline: any = {
      timeline: ['frameA', 'frameB'],
      errors: ['fake error (truncating timeline at step 3)'],
    }
    const errorTestCases: Array<{
      title: string
      activeItem: HoverableItem | null
      expected: CommandsAndRobotState | null | string
    }> = [
      {
        title:
          'should return the correct timeline frame when final deck state is active',
        activeItem: {
          selectionType: TERMINAL_ITEM_SELECTION_TYPE,
          id: END_TERMINAL_ITEM_ID,
        },
        expected: lastValidFrame,
      },
      {
        title:
          'should return the correct timeline frame when presaved form item is active',
        activeItem: {
          selectionType: TERMINAL_ITEM_SELECTION_TYPE,
          id: PRESAVED_STEP_ID,
        },
        expected: lastValidFrame,
      },
      {
        title: 'should return the timeline frame before step 1',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step1',
        },
        expected: initialFrame,
      },
      {
        title: 'should return the timeline frame before step 2',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step2',
        },
        expected: 'frameA',
      },
      {
        title: 'should return the timeline frame before step 3',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step3',
        },
        expected: 'frameB',
      },
      {
        title:
          'should return the last valid timeline frame before step 4 (timeline error case)',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step4',
        },
        expected: lastValidFrame,
      },
      {
        title:
          'should return the last valid timeline frame before step 5 (timeline error case)',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step4',
        },
        expected: lastValidFrame,
      },
    ]
    errorTestCases.forEach(({ title, activeItem, expected }) => {
      it(title, () => {
        const result = (timelineFrameBeforeActiveItem as any).resultFunc(
          activeItem,
          initialRobotState,
          truncatedRobotStateTimeline,
          lastValidRobotState,
          orderedStepIds
        )
        expect(result).toEqual(expected)
      })
    })
  })
})
describe('timelineFrameAfterActiveItem', () => {
  describe('full timeline (no errors)', () => {
    // this should represent the full timeline, no errors in any steps
    const fullRobotStateTimeline: any = {
      timeline: ['frameA', 'frameB', 'frameC', 'frameD', 'frameE'],
    }
    const noErrorTestCases: Array<{
      title: string
      activeItem: HoverableItem | null
      expected: CommandsAndRobotState | null | string
    }> = [
      {
        title: 'should return null when there is no activeItem',
        activeItem: null,
        expected: null,
      },
      {
        title:
          'should return the correct timeline frame when the initial deck setup is active',
        activeItem: {
          selectionType: TERMINAL_ITEM_SELECTION_TYPE,
          id: START_TERMINAL_ITEM_ID,
        },
        expected: initialFrame,
      },
      {
        title:
          'should return the last timeline frame when final deck state is active',
        activeItem: {
          selectionType: TERMINAL_ITEM_SELECTION_TYPE,
          id: END_TERMINAL_ITEM_ID,
        },
        expected: lastValidFrame,
      },
      {
        title:
          'should return the last timeline frame when presaved form item is active',
        activeItem: {
          selectionType: TERMINAL_ITEM_SELECTION_TYPE,
          id: PRESAVED_STEP_ID,
        },
        expected: lastValidFrame,
      },
      {
        title:
          'should return the timeline frame after step 1 when step 1 is selected',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step1',
        },
        expected: 'frameA',
      },
      {
        title:
          'should return the timeline frame after step 5 when step 5 is selected',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step5',
        },
        expected: 'frameE',
      },
    ]
    noErrorTestCases.forEach(({ title, activeItem, expected }) => {
      it(title, () => {
        const result = (timelineFrameAfterActiveItem as any).resultFunc(
          activeItem,
          initialRobotState,
          fullRobotStateTimeline,
          lastValidRobotState,
          orderedStepIds
        )
        expect(result).toEqual(expected)
      })
    })
  })
  describe('error case (timeline trunacted due to error at step 3)', () => {
    // this should represent a timeline truncated due to error in step 3
    const truncatedRobotStateTimeline: any = {
      timeline: ['frameA', 'frameB'],
      errors: ['fake error (truncating timeline at step 3)'],
    }
    const errorTestCases: Array<{
      title: string
      activeItem: HoverableItem | null
      expected: CommandsAndRobotState | null | string
    }> = [
      {
        title:
          'should return the correct timeline frame when final deck state is active',
        activeItem: {
          selectionType: TERMINAL_ITEM_SELECTION_TYPE,
          id: END_TERMINAL_ITEM_ID,
        },
        expected: lastValidFrame,
      },
      {
        title:
          'should return the correct timeline frame when presaved form item is active',
        activeItem: {
          selectionType: TERMINAL_ITEM_SELECTION_TYPE,
          id: PRESAVED_STEP_ID,
        },
        expected: lastValidFrame,
      },
      {
        title: 'should return the timeline frame after step 1',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step1',
        },
        expected: 'frameA',
      },
      {
        title: 'should return the timeline frame after step 2',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step2',
        },
        expected: 'frameB',
      },
      {
        title:
          'should return the timeline frame after step 3 (timeline error case)',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step3',
        },
        expected: lastValidFrame,
      },
      {
        title:
          'should return the last valid timeline frame after step 4 (timeline error case)',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step4',
        },
        expected: lastValidFrame,
      },
      {
        title:
          'should return the last valid timeline frame after step 5 (timeline error case)',
        activeItem: {
          selectionType: SINGLE_STEP_SELECTION_TYPE,
          id: 'step4',
        },
        expected: lastValidFrame,
      },
    ]
    errorTestCases.forEach(({ title, activeItem, expected }) => {
      it(title, () => {
        const result = (timelineFrameAfterActiveItem as any).resultFunc(
          activeItem,
          initialRobotState,
          truncatedRobotStateTimeline,
          lastValidRobotState,
          orderedStepIds
        )
        expect(result).toEqual(expected)
      })
    })
  })
})
