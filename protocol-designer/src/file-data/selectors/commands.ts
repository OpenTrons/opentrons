import { createSelector } from 'reselect'
import last from 'lodash/last'
import mapValues from 'lodash/mapValues'
import omit from 'lodash/omit'
import uniqBy from 'lodash/uniqBy'
import * as StepGeneration from '@opentrons/step-generation'
import { getAllWellsForLabware } from '/protocol-designer/constants'
import { selectors as labwareIngredSelectors } from '/protocol-designer/labware-ingred/selectors'
import { selectors as stepFormSelectors } from '/protocol-designer/step-forms'
import type {
  LabwareOnDeck,
  LabwareTemporalProperties,
  ModuleOnDeck,
  ModuleTemporalProperties,
  PipetteOnDeck,
  PipetteTemporalProperties,
} from '/protocol-designer/step-forms'
import type { Substeps } from '/protocol-designer/steplist/types'
import type { BaseState, Selector } from '/protocol-designer/types'
import type { StepIdType } from '/protocol-designer/form-types'

// NOTE this just adds missing well keys to the labware-ingred 'deck setup' liquid state
export const getLabwareLiquidState: Selector<StepGeneration.LabwareLiquidState> = createSelector(
  labwareIngredSelectors.getLiquidsByLabwareId,
  stepFormSelectors.getLabwareEntities,
  (ingredLocations, labwareEntities) => {
    const allLabwareIds: string[] = Object.keys(labwareEntities)
    return allLabwareIds.reduce(
      (
        acc: StepGeneration.LabwareLiquidState,
        labwareId
      ): StepGeneration.LabwareLiquidState => {
        const labwareDef = labwareEntities[labwareId].def
        const allWells = labwareDef ? getAllWellsForLabware(labwareDef) : []
        const liquidStateForLabwareAllWells = allWells.reduce(
          (innerAcc: StepGeneration.SingleLabwareLiquidState, well) => ({
            ...innerAcc,
            [well]:
              (ingredLocations[labwareId] &&
                ingredLocations[labwareId][well]) ||
              {},
          }),
          {}
        )
        return { ...acc, [labwareId]: liquidStateForLabwareAllWells }
      },
      {}
    )
  }
)
export const getInitialRobotState: (
  arg0: BaseState
) => StepGeneration.RobotState = createSelector(
  stepFormSelectors.getInitialDeckSetup,
  stepFormSelectors.getInvariantContext,
  getLabwareLiquidState,
  (initialDeckSetup, invariantContext, labwareLiquidState) => {
    const pipettes: Record<string, PipetteTemporalProperties> = mapValues(
      initialDeckSetup.pipettes,
      (p: PipetteOnDeck): PipetteTemporalProperties => ({
        mount: p.mount,
      })
    )
    const labware: Record<string, LabwareTemporalProperties> = mapValues(
      initialDeckSetup.labware,
      (l: LabwareOnDeck): LabwareTemporalProperties => ({
        slot: l.slot,
      })
    )
    const modules: Record<string, ModuleTemporalProperties> = mapValues(
      initialDeckSetup.modules,
      (m: ModuleOnDeck): ModuleTemporalProperties => {
        return omit(m, ['id', 'type', 'model'])
      }
    )
    const robotState = StepGeneration.makeInitialRobotState({
      invariantContext,
      labwareLocations: labware,
      moduleLocations: modules,
      pipetteLocations: pipettes,
    })
    robotState.liquidState.labware = labwareLiquidState
    return robotState
  }
)

export const getTimelineIsBeingComputed: Selector<boolean> = state =>
  state.fileData.timelineIsBeingComputed
// exposes errors and last valid robotState
export const getRobotStateTimeline: Selector<StepGeneration.Timeline> = state =>
  state.fileData.computedRobotStateTimeline
export const getSubsteps: Selector<Substeps> = state =>
  state.fileData.computedSubsteps
type WarningsPerStep = {
  [stepId in number | string]?: StepGeneration.CommandCreatorWarning[] | null
}
export const timelineWarningsPerStep: Selector<WarningsPerStep> = createSelector(
  stepFormSelectors.getOrderedStepIds,
  getRobotStateTimeline,
  (orderedStepIds, timeline) =>
    timeline.timeline.reduce((acc: WarningsPerStep, frame, timelineIndex) => {
      const stepId = orderedStepIds[timelineIndex]
      // remove warnings of duplicate 'type'. chosen arbitrarily
      return { ...acc, [stepId]: uniqBy(frame.warnings, w => w.type) }
    }, {})
)
export const getErrorStepId: Selector<
  StepIdType | null | undefined
> = createSelector(
  stepFormSelectors.getOrderedStepIds,
  getRobotStateTimeline,
  (orderedStepIds, timeline) => {
    const hasErrors = timeline.errors && timeline.errors.length > 0

    if (hasErrors) {
      // the frame *after* the last frame in the timeline is the error-throwing one
      const errorIndex = timeline.timeline.length
      const errorStepId = orderedStepIds[errorIndex]
      return errorStepId
    }

    return null
  }
)
export const lastValidRobotState: Selector<StepGeneration.RobotState> = createSelector(
  getRobotStateTimeline,
  getInitialRobotState,
  (timeline, initialRobotState) => {
    const lastTimelineFrame = last(timeline.timeline)
    return (
      (lastTimelineFrame && lastTimelineFrame.robotState) || initialRobotState
    )
  }
)
