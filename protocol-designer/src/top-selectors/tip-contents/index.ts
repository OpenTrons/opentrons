import { createSelector } from 'reselect'
import reduce from 'lodash/reduce'
import mapValues from 'lodash/mapValues'
import {
  START_TERMINAL_ITEM_ID,
  END_TERMINAL_ITEM_ID,
  PRESAVED_STEP_ID,
} from '/protocol-designer/steplist'
import { selectors as stepFormSelectors } from '/protocol-designer/step-forms'
import { getActiveItem } from '/protocol-designer/ui/steps'
import { TERMINAL_ITEM_SELECTION_TYPE } from '/protocol-designer/ui/steps/reducers'
import { selectors as fileDataSelectors } from '/protocol-designer/file-data'
import type { WellGroup } from '@opentrons/components'
import type { Selector } from '/protocol-designer/types'
export const getMissingTipsByLabwareId: Selector<Record<
  string,
  WellGroup
> | null> = createSelector(
  stepFormSelectors.getOrderedStepIds,
  fileDataSelectors.getRobotStateTimeline,
  getActiveItem,
  fileDataSelectors.getInitialRobotState,
  fileDataSelectors.lastValidRobotState,
  (
    orderedStepIds,
    robotStateTimeline,
    activeItem,
    initialRobotState,
    lastValidRobotState
  ) => {
    let robotState = null
    if (activeItem == null) return null

    if (activeItem.selectionType === TERMINAL_ITEM_SELECTION_TYPE) {
      const terminalId = activeItem.id

      if (terminalId === START_TERMINAL_ITEM_ID) {
        robotState = initialRobotState
      } else if (
        terminalId === END_TERMINAL_ITEM_ID ||
        terminalId === PRESAVED_STEP_ID
      ) {
        robotState = lastValidRobotState
      } else {
        console.error(
          `Invalid terminalId ${terminalId}, could not getMissingTipsByLabwareId`
        )
      }
    } else {
      const stepId = activeItem.id
      const timeline = robotStateTimeline.timeline
      const timelineIdx = orderedStepIds.includes(stepId)
        ? orderedStepIds.findIndex(id => id === stepId)
        : null

      if (timelineIdx == null) {
        console.error(`Expected non-null timelineIdx for step ${stepId}`)
        return null
      }

      const prevFrame = timeline[timelineIdx - 1]
      if (prevFrame) robotState = prevFrame.robotState
    }

    const missingTips =
      robotState &&
      robotState.tipState &&
      mapValues(robotState.tipState.tipracks, tipMap =>
        reduce(
          tipMap,
          (acc, hasTip, wellName): WellGroup =>
            hasTip ? acc : { ...acc, [wellName]: null },
          {}
        )
      )
    return missingTips
  }
)
