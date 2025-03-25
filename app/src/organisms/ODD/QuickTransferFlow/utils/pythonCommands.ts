import {
  consolidate,
  distribute,
  getLoadAdapters,
  getLoadLabware,
  getLoadPipettes,
  getLoadTrashBins,
  getLoadWasteChute,
  indentPyLines,
  InvariantContext,
  PROTOCOL_CONTEXT_NAME,
  transfer,
} from '@opentrons/step-generation'
import { generateQuickTransferArgs } from './generateQuickTransferArgs'
import type {
  CommandCreatorResult,
  TimelineFrame,
} from '@opentrons/step-generation'
import type { DeckConfiguration } from '@opentrons/shared-data'
import type { QuickTransferSummaryState } from '../types'
import type { MoveLiquidStepArgs } from './generateQuickTransferArgs'

export function quickTransferStepCommands(
  stepArgs: MoveLiquidStepArgs,
  invariantContext: InvariantContext,
  initialRobotState: TimelineFrame
): string {
  let nonLoadCommandCreator: CommandCreatorResult | null = null
  if (stepArgs?.commandCreatorFnName === 'transfer') {
    nonLoadCommandCreator = transfer(
      stepArgs,
      invariantContext,
      initialRobotState
    )
  } else if (stepArgs?.commandCreatorFnName === 'consolidate') {
    nonLoadCommandCreator = consolidate(
      stepArgs,
      invariantContext,
      initialRobotState
    )
  } else if (stepArgs?.commandCreatorFnName === 'distribute') {
    nonLoadCommandCreator = distribute(
      stepArgs,
      invariantContext,
      initialRobotState
    )
  }

  const nonLoadCommands =
    nonLoadCommandCreator != null && 'python' in nonLoadCommandCreator
      ? nonLoadCommandCreator.python ?? []
      : []

  return `# ${stepArgs?.commandCreatorFnName} STEPS\n\n` + nonLoadCommands
}

export function pythonCommands(
  quickTransferState: QuickTransferSummaryState,
  deckConfig: DeckConfiguration
): string {
  const {
    stepArgs,
    invariantContext,
    initialRobotState,
  } = generateQuickTransferArgs(quickTransferState, deckConfig)
  const {
    moduleEntities,
    labwareEntities,
    pipetteEntities,
    additionalEquipmentEntities,
  } = invariantContext
  const { labware, pipettes } = initialRobotState
  const sections: string[] = [
    getLoadAdapters(moduleEntities, labwareEntities, labware),
    getLoadLabware(moduleEntities, labwareEntities, labware, {}),
    getLoadPipettes(pipetteEntities, labwareEntities, pipettes),
    ...[
      getLoadTrashBins(additionalEquipmentEntities),
      getLoadWasteChute(additionalEquipmentEntities),
    ],
    quickTransferStepCommands(stepArgs, invariantContext, initialRobotState),
  ]
  const functionBody =
    sections
      .filter(section => section) // skip empty sections
      .join('\n\n') || 'pass'
  return (
    `def run(${PROTOCOL_CONTEXT_NAME}: protocol_api.ProtocolContext):\n` +
    `${indentPyLines(functionBody)}`
  )
}
