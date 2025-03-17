/** Generate sections of the Python file for fileCreator.ts */

import {
  FLEX_ROBOT_TYPE,
  OT2_ROBOT_TYPE,
  getCutoutDisplayName,
  isFlexPipette,
} from '@opentrons/shared-data'
import {
  formatPyDict,
  formatPyStr,
  indentPyLines,
  OFF_DECK,
  PROTOCOL_CONTEXT_NAME,
} from '@opentrons/step-generation'
import { getFlexNameConversion } from './utils'
import type {
  AdditionalEquipmentEntities,
  InvariantContext,
  LabwareEntities,
  LabwareLiquidState,
  LiquidEntities,
  ModuleEntities,
  PipetteEntities,
  Timeline,
  TimelineFrame,
} from '@opentrons/step-generation'
import type { CutoutId, RobotType } from '@opentrons/shared-data'
import type { FileMetadataFields } from '../types'

const PAPI_VERSION = '2.23' // latest version from api/src/opentrons/protocols/api_support/definitions.py

export function pythonImports(): string {
  return [
    'from contextlib import nullcontext as pd_step',
    'from opentrons import protocol_api, types',
  ].join('\n')
}

export function pythonMetadata(fileMetadata: FileMetadataFields): string {
  // FileMetadataFields has timestamps, lists, etc., but Python metadata dict can only contain strings
  function formatTimestamp(timestamp: number | null | undefined): string {
    return timestamp ? new Date(timestamp).toISOString() : ''
  }
  const stringifiedMetadata = Object.fromEntries(
    Object.entries({
      protocolName: fileMetadata.protocolName,
      author: fileMetadata.author,
      description: fileMetadata.description,
      created: formatTimestamp(fileMetadata.created),
      lastModified: formatTimestamp(fileMetadata.lastModified),
      category: fileMetadata.category,
      subcategory: fileMetadata.subcategory,
      tags: fileMetadata.tags?.length && fileMetadata.tags.join(', '),
      protocolDesigner: process.env.OT_PD_VERSION,
      source: fileMetadata.source,
    }).filter(([key, value]) => value) // drop blank entries
  )
  return `metadata = ${formatPyDict(stringifiedMetadata)}`
}

export function pythonRequirements(robotType: RobotType): string {
  const ROBOTTYPE_TO_PAPI_NAME = {
    // values from api/src/opentrons/protocols/parse.py
    [OT2_ROBOT_TYPE]: 'OT-2',
    [FLEX_ROBOT_TYPE]: 'Flex',
  }
  const requirements = {
    robotType: ROBOTTYPE_TO_PAPI_NAME[robotType],
    apiLevel: PAPI_VERSION,
  }
  return `requirements = ${formatPyDict(requirements)}`
}

export function getLoadModules(
  moduleEntities: ModuleEntities,
  moduleRobotState: TimelineFrame['modules']
): string {
  const hasModules = Object.keys(moduleEntities).length > 0
  const pythonModules = hasModules
    ? Object.values(moduleEntities)
        .map(module => {
          // pythonIdentifier (module.model) from api/src/opentrons/protocol_api/validation.py#L373
          return `${
            module.pythonName
          } = ${PROTOCOL_CONTEXT_NAME}.load_module(${formatPyStr(
            module.model
          )}, ${formatPyStr(moduleRobotState[module.id].slot)})`
        })
        .join('\n')
    : ''
  return hasModules ? `# Load Modules:\n${pythonModules}` : ''
}
//  note: label arg is not needed since PD does not support giving an adapter
//  a nickname
export function getLoadAdapters(
  moduleEntities: ModuleEntities,
  labwareEntities: LabwareEntities,
  labwareRobotState: TimelineFrame['labware']
): string {
  const adapterEntities = Object.values(labwareEntities).filter(lw =>
    lw.def.allowedRoles?.includes('adapter')
  )
  const pythonAdapters = Object.values(adapterEntities)
    .map(adapter => {
      const { id, def, pythonName } = adapter
      const { parameters, namespace, version } = def
      const adapterSlot = labwareRobotState[id].slot
      const onModule = moduleEntities[adapterSlot] != null
      const location = onModule
        ? moduleEntities[adapterSlot].pythonName
        : PROTOCOL_CONTEXT_NAME

      const adapterArgs = [
        `${formatPyStr(parameters.loadName)}`,
        ...(!onModule
          ? [
              `${formatPyStr(
                adapterSlot === 'offDeck' ? OFF_DECK : adapterSlot
              )}`,
            ]
          : []),
        `namespace=${formatPyStr(namespace)}`,
        `version=${version}`,
      ].join(',\n')

      return (
        `${pythonName} = ${location}.load_adapter(\n` +
        `${indentPyLines(adapterArgs)},\n` +
        `)`
      )
    })
    .join('\n')

  return pythonAdapters ? `# Load Adapters:\n${pythonAdapters}` : ''
}

export function getLoadLabware(
  moduleEntities: ModuleEntities,
  allLabwareEntities: LabwareEntities,
  labwareRobotState: TimelineFrame['labware'],
  labwareNicknamesById: Record<string, string>
): string {
  const labwareEntities = Object.values(allLabwareEntities).filter(
    lw => !lw.def.allowedRoles?.includes('adapter')
  )
  const pythonLabware = Object.values(labwareEntities)
    .map(labware => {
      const { id, def, pythonName } = labware
      const { metadata, parameters, namespace, version } = def
      const hasNickname = labwareNicknamesById[id] !== metadata.displayName
      const labwareSlot = labwareRobotState[id].slot
      const onModule = moduleEntities[labwareSlot] != null
      const onAdapter = allLabwareEntities[labwareSlot] != null
      let location = PROTOCOL_CONTEXT_NAME
      if (onAdapter) {
        location = allLabwareEntities[labwareSlot].pythonName
      } else if (onModule) {
        location = moduleEntities[labwareSlot].pythonName
      }

      const labwareArgs = [
        `${formatPyStr(parameters.loadName)}`,
        ...(!onModule && !onAdapter
          ? [
              `${formatPyStr(
                labwareSlot === 'offDeck' ? OFF_DECK : labwareSlot
              )}`,
            ]
          : []),
        ...(hasNickname
          ? [`label=${formatPyStr(labwareNicknamesById[id])}`]
          : []),
        `namespace=${formatPyStr(namespace)}`,
        `version=${version}`,
      ].join(',\n')

      return (
        `${pythonName} = ${location}.load_labware(\n` +
        `${indentPyLines(labwareArgs)},\n` +
        `)`
      )
    })
    .join('\n')

  return pythonLabware ? `# Load Labware:\n${pythonLabware}` : ''
}

export function stepCommands(robotStateTimeline: Timeline): string {
  return (
    '# PROTOCOL STEPS\n\n' +
    robotStateTimeline.timeline
      .map(
        (timelineFrame, idx) =>
          `# Step ${idx + 1}:\n${timelineFrame.python || 'pass'}`
      )
      .join('\n\n')
  )
}

export function getLoadPipettes(
  pipetteEntities: PipetteEntities,
  labwareEntities: LabwareEntities,
  pipetteRobotState: TimelineFrame['pipettes']
): string {
  const pythonPipette = Object.values(pipetteEntities)
    .map(pipette => {
      const { name, id, spec, pythonName, tiprackDefURI } = pipette
      const mount =
        spec.channels === 96
          ? ''
          : `, ${formatPyStr(pipetteRobotState[id].mount)}`
      const pipetteName = isFlexPipette(name)
        ? getFlexNameConversion(spec)
        : name
      const tiprackPythonNames = tiprackDefURI
        .flatMap(defURI =>
          Object.values(labwareEntities).filter(
            lw => lw.labwareDefURI === defURI
          )
        )
        .map(tiprack => tiprack.pythonName)
        .join(', ')
      const pythonTipRacks =
        tiprackDefURI.length === 0 ? '' : `, tip_racks=[${tiprackPythonNames}]`

      return `${pythonName} = ${PROTOCOL_CONTEXT_NAME}.load_instrument(${formatPyStr(
        pipetteName
      )}${mount}${pythonTipRacks})`
    })
    .join('\n')

  return pythonPipette ? `# Load Pipettes:\n${pythonPipette}` : ''
}

export function getDefineLiquids(liquidEntities: LiquidEntities): string {
  const pythonDefineLiquids = Object.values(liquidEntities)
    .map(liquid => {
      const { pythonName, displayColor, displayName, description } = liquid
      const liquidArgs = [
        `${formatPyStr(displayName)}`,
        ...(description ? [`description=${formatPyStr(description)}`] : []),
        `display_color=${formatPyStr(displayColor)}`,
      ].join(',\n')

      return (
        `${pythonName} = ${PROTOCOL_CONTEXT_NAME}.define_liquid(\n` +
        `${indentPyLines(liquidArgs)},\n` +
        `)`
      )
    })
    .join('\n')
  return pythonDefineLiquids ? `# Define Liquids:\n${pythonDefineLiquids}` : ''
}

export function getLoadLiquids(
  liquidsByLabwareId: LabwareLiquidState,
  liquidEntities: LiquidEntities,
  labwareEntities: LabwareEntities
): string {
  const pythonLoadLiquids = Object.entries(liquidsByLabwareId)
    .flatMap(([labwareId, liquidState]) => {
      const labwarePythonName = labwareEntities[labwareId].pythonName

      return Object.entries(liquidState).flatMap(([well, locationState]) =>
        Object.entries(locationState)
          .map(([liquidGroupId, volume]) => {
            const liquidPythonName = liquidEntities[liquidGroupId].pythonName
            return `${labwarePythonName}[${formatPyStr(
              well
            )}].load_liquid(${liquidPythonName}, ${volume.volume})`
          })
          .join('\n')
      )
    })
    .join('\n')
  return pythonLoadLiquids ? `# Load Liquids:\n${pythonLoadLiquids}` : ''
}

export function getLoadTrashBins(
  additionalEquipmentEntities: AdditionalEquipmentEntities
): string {
  const pythonLoadTrashBins = Object.values(additionalEquipmentEntities)
    .filter(ae => ae.name === 'trashBin')
    ?.map(trashBin => {
      const location = formatPyStr(
        getCutoutDisplayName(trashBin.location as CutoutId)
      )
      return `${trashBin.pythonName} = ${PROTOCOL_CONTEXT_NAME}.load_trash_bin(${location})`
    })
    .join('\n')

  return pythonLoadTrashBins ? `# Load Trash Bins:\n${pythonLoadTrashBins}` : ''
}

export function getLoadWasteChute(
  additionalEquipmentEntities: AdditionalEquipmentEntities
): string {
  const pythonLoadWasteChute = Object.values(additionalEquipmentEntities)
    .filter(ae => ae.name === 'wasteChute')
    ?.map(
      wasteChute =>
        `${wasteChute.pythonName} = ${PROTOCOL_CONTEXT_NAME}.load_waste_chute()`
    )

  return pythonLoadWasteChute.length > 0
    ? `# Load Waste Chute:\n${pythonLoadWasteChute}`
    : ''
}

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
    additionalEquipmentEntities,
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
          getLoadTrashBins(additionalEquipmentEntities),
          getLoadWasteChute(additionalEquipmentEntities),
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
