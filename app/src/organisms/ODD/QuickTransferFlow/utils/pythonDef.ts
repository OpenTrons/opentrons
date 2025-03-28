import upperCase from 'lodash/upperCase'
import {
  consolidate,
  distribute,
  getLoadAdapters,
  getLoadLabware,
  getLoadPipettes,
  getLoadTrashBins,
  getLoadWasteChute,
  indentPyLines,
  PROTOCOL_CONTEXT_NAME,
  transfer,
} from '@opentrons/step-generation'
import { generateQuickTransferArgs } from './generateQuickTransferArgs'
import type {
  CommandCreatorResult,
  InvariantContext,
  TimelineFrame,
} from '@opentrons/step-generation'
import type { DeckConfiguration } from '@opentrons/shared-data'
import type { QuickTransferSummaryState } from '../types'
import type { MoveLiquidStepArgs } from './generateQuickTransferArgs'

interface QuickTransferStepCommandsProps {
  stepArgs: MoveLiquidStepArgs
  invariantContext: InvariantContext
  initialRobotState: TimelineFrame
}

export function quickTransferStepCommands(
  props: QuickTransferStepCommandsProps
): string {
  const { stepArgs, invariantContext, initialRobotState } = props
  const {
    trashBinEntities,
    wasteChuteEntities,
    pipetteEntities,
  } = invariantContext
  const pipettePythonName = Object.values(pipetteEntities)[0].pythonName
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

  let finalDropTipCommand = ''

  if (Object.values(trashBinEntities).length > 0) {
    finalDropTipCommand = `${pipettePythonName}.drop_tip()`
  } else if (Object.values(wasteChuteEntities).length > 0) {
    const wasteChuteEntity = Object.values(wasteChuteEntities)[0]
    finalDropTipCommand = `${pipettePythonName}.drop_tip(${wasteChuteEntity.pythonName})`
  }

  return (
    `# ${upperCase(stepArgs?.commandCreatorFnName)} STEP\n\n` +
    nonLoadCommands +
    `\n` +
    finalDropTipCommand
  )
}

export function pythonDef(
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
    wasteChuteEntities,
    trashBinEntities,
  } = invariantContext
  const { labware, pipettes } = initialRobotState
  const sections: string[] = [
    getLoadAdapters(moduleEntities, labwareEntities, labware),
    getLoadLabware(moduleEntities, labwareEntities, labware, {}),
    getLoadPipettes(pipetteEntities, labwareEntities, pipettes),
    ...[
      getLoadTrashBins(trashBinEntities),
      getLoadWasteChute(wasteChuteEntities),
    ],
    quickTransferStepCommands({
      stepArgs,
      invariantContext,
      initialRobotState,
    }),
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
