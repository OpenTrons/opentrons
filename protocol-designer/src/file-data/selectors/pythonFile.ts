/** Generate sections of the Python file for fileCreator.ts */
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import {
  getDefineLiquids,
  getLoadAdapters,
  getLoadLabware,
  getLoadLiquids,
  getLoadModules,
  getLoadPipettes,
  getLoadTrashBins,
  getLoadWasteChute,
  indentPyLines,
  PROTOCOL_CONTEXT_NAME,
  stepCommands,
} from '@opentrons/step-generation'
import type {
  InvariantContext,
  LabwareLiquidState,
  Timeline,
  TimelineFrame,
} from '@opentrons/step-generation'
import type { RobotType } from '@opentrons/shared-data'

export function pythonDefRun(
  invariantContext: InvariantContext,
  robotState: TimelineFrame,
  robotStateTimeline: Timeline,
  liquidsByLabwareId: LabwareLiquidState,
  labwareNicknamesById: Record<string, string>,
  robotType: RobotType
): string {
  const {
    moduleEntities,
    labwareEntities,
    pipetteEntities,
    liquidEntities,
    wasteChuteEntities,
    trashBinEntities,
  } = invariantContext
  const { modules, labware, pipettes } = robotState
  const sections: string[] = [
    getLoadModules(moduleEntities, modules),
    getLoadAdapters(moduleEntities, labwareEntities, labware),
    getLoadLabware(
      moduleEntities,
      labwareEntities,
      labware,
      labwareNicknamesById
    ),
    getLoadPipettes(pipetteEntities, labwareEntities, pipettes),
    ...(robotType === FLEX_ROBOT_TYPE
      ? [
          getLoadTrashBins(trashBinEntities),
          getLoadWasteChute(wasteChuteEntities),
        ]
      : []),
    getDefineLiquids(liquidEntities),
    getLoadLiquids(liquidsByLabwareId, liquidEntities, labwareEntities),
    stepCommands(robotStateTimeline),
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
