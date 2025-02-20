import mapValues from 'lodash/mapValues'
import {
  FLEX_ROBOT_TYPE,
  FLEX_STANDARD_DECKID,
  OT2_STANDARD_DECKID,
  OT2_STANDARD_MODEL,
} from '@opentrons/shared-data'
import { uuid } from '../../utils'
import { INITIAL_DECK_SETUP_STEP_ID } from '../../constants'
import type {
  ProtocolFileV7,
  MoveToAddressableAreaCreateCommand,
} from '@opentrons/shared-data'
import type {
  CommandAnnotationV1Mixin,
  CommandV8Mixin,
  CreateCommand as CreateCommandV8,
  LabwareMixin,
  LiquidV1Mixin,
  LoadPipetteCreateCommand,
  OT2RobotMixin,
  OT3RobotMixin,
  ProtocolBase,
  ProtocolFile,
} from '@opentrons/shared-data/protocol/types/schemaV8'
import type { CreateCommand as CreateCommandV7 } from '@opentrons/shared-data/protocol/types/schemaV7'
import type { DesignerApplicationData } from './utils/getLoadLiquidCommands'

// NOTE: this migration is to schema v8 and updates fixed trash by
// treating it as an entity. Additionally, drop tip location is now selectable
const PD_VERSION = '8.0.0'
const SCHEMA_VERSION = 8
interface LabwareLocationUpdate {
  [id: string]: string
}

export const migrateFile = (
  appData: ProtocolFileV7<DesignerApplicationData>
): ProtocolFile => {
  const { designerApplication, commands, robot, liquids } = appData

  if (designerApplication == null || designerApplication.data == null) {
    throw Error('The designerApplication key in your file is corrupt.')
  }

  const labwareLocationUpdate: LabwareLocationUpdate =
    designerApplication.data.savedStepForms[INITIAL_DECK_SETUP_STEP_ID]
      .labwareLocationUpdate

  const robotType = robot.model
  const trashId = `${uuid()}:trashBin`
  const trashAddressableArea =
    robotType === FLEX_ROBOT_TYPE ? 'movableTrashA3' : 'fixedTrash'

  const pipetteId = Object.values(commands).find(
    (command): command is LoadPipetteCreateCommand =>
      command.commandType === 'loadPipette'
  )?.params.pipetteId

  const trashMoveToAddressableAreaCommand: MoveToAddressableAreaCreateCommand[] = [
    {
      key: uuid(),
      commandType: 'moveToAddressableArea',
      params: {
        addressableAreaName: trashAddressableArea,
        pipetteId: pipetteId ?? '',
        offset: { x: 0, y: 0, z: 0 },
      },
    },
  ]

  const migrateCommands = (
    v7Commands: CreateCommandV7[]
  ): CreateCommandV8[] => {
    return v7Commands.filter(
      v7Command =>
        !(
          v7Command.commandType === 'loadLabware' &&
          v7Command.params.labwareId === 'fixedTrash'
        )
    )
  }

  const migratedV7Commands = migrateCommands(commands)

  const newLabwareLocationUpdate: LabwareLocationUpdate = Object.keys(
    labwareLocationUpdate
  ).reduce((acc: LabwareLocationUpdate, labwareId: string) => {
    if (labwareId !== 'fixedTrash') {
      acc[labwareId] = labwareLocationUpdate[labwareId]
    }
    return acc
  }, {})
  const migrateSavedStepForms = (
    savedStepForms: Record<string, any>
  ): Record<string, any> => {
    return mapValues(savedStepForms, stepForm => {
      const sharedParams = {
        blowout_location:
          stepForm.blowout_location === 'fixedTrash'
            ? trashId
            : stepForm.blowout_location,
        dropTip_location: trashId,
      }

      if (stepForm.stepType === 'moveLiquid') {
        return {
          ...stepForm,
          nozzles: null,
          aspirate_labware:
            stepForm.aspirate_labware === 'fixedTrash'
              ? null
              : stepForm.aspirate_labware,
          dispense_labware:
            stepForm.dispense_labware === 'fixedTrash'
              ? trashId
              : stepForm.dispense_labware,
          ...sharedParams,
        }
      } else if (stepForm.stepType === 'mix') {
        return {
          ...stepForm,
          nozzles: null,
          labware: stepForm.labware === 'fixedTrash' ? null : stepForm.labware,
          ...sharedParams,
        }
      }

      return stepForm
    })
  }

  const filteredSavedStepForms = Object.fromEntries(
    Object.entries(
      appData.designerApplication?.data?.savedStepForms ?? {}
    ).filter(([key, value]) => key !== INITIAL_DECK_SETUP_STEP_ID)
  )
  const newFilteredSavedStepForms = migrateSavedStepForms(
    filteredSavedStepForms
  )

  const flexDeckSpec: OT3RobotMixin = {
    robot: {
      model: FLEX_ROBOT_TYPE,
      deckId: FLEX_STANDARD_DECKID,
    },
  }
  const ot2DeckSpec: OT2RobotMixin = {
    robot: {
      model: OT2_STANDARD_MODEL,
      deckId: OT2_STANDARD_DECKID,
    },
  }
  const deckStructure =
    robotType === FLEX_ROBOT_TYPE ? flexDeckSpec : ot2DeckSpec

  const protocolBase: ProtocolBase<DesignerApplicationData> = {
    $otSharedSchema: '#/protocol/schemas/8',
    schemaVersion: SCHEMA_VERSION,
    metadata: {
      ...appData.metadata,
    },
    designerApplication: {
      ...appData.designerApplication,
      version: PD_VERSION,
      data: {
        ...designerApplication.data,
        savedStepForms: {
          [INITIAL_DECK_SETUP_STEP_ID]: {
            ...designerApplication.data.savedStepForms[
              INITIAL_DECK_SETUP_STEP_ID
            ],
            labwareLocationUpdate: {
              ...newLabwareLocationUpdate,
            },
          },
          ...newFilteredSavedStepForms,
        },
      },
    },
  }

  const labwareMixin: LabwareMixin = {
    labwareDefinitionSchemaId: '', // Deliberate empty string. See schema documentation.
    labwareDefinitions: {
      ...appData.labwareDefinitions,
    },
  }

  const liquidV1Mixin: LiquidV1Mixin = {
    liquidSchemaId: 'opentronsLiquidSchemaV1',
    liquids,
  }

  const commandv8Mixin: CommandV8Mixin = {
    commandSchemaId: 'opentronsCommandSchemaV8',
    commands: [...migratedV7Commands, ...trashMoveToAddressableAreaCommand],
  }

  const commandAnnotionaV1Mixin: CommandAnnotationV1Mixin = {
    commandAnnotationSchemaId: 'opentronsCommandAnnotationSchemaV1',
    commandAnnotations: [],
  }

  return {
    ...protocolBase,
    ...deckStructure,
    ...labwareMixin,
    ...liquidV1Mixin,
    ...commandv8Mixin,
    ...commandAnnotionaV1Mixin,
  }
}
