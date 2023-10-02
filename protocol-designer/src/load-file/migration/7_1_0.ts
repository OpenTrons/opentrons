import mapValues from 'lodash/mapValues'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { getOnlyLatestDefs } from '../../labware-defs'
import { uuid } from '../../utils'
import {
  FLEX_TRASH_DEF_URI,
  INITIAL_DECK_SETUP_STEP_ID,
  OT_2_TRASH_DEF_URI,
} from '../../constants'
import type {
  LoadLabwareCreateCommand,
  ProtocolFile,
} from '@opentrons/shared-data/protocol/types/schemaV7'
import type { DesignerApplicationData } from './utils/getLoadLiquidCommands'

// NOTE: this migration updates fixed trash by treating it as an entity
// additionally, drop tip location is now selectable
const PD_VERSION = '7.1.0'

interface LabwareLocationUpdate {
  [id: string]: string
}

export const migrateFile = (
  appData: ProtocolFile<DesignerApplicationData>
): ProtocolFile => {
  const { designerApplication, robot, commands } = appData
  const labwareLocationUpdate: LabwareLocationUpdate =
    designerApplication?.data?.savedStepForms[INITIAL_DECK_SETUP_STEP_ID]
      .labwareLocationUpdate
  const allLatestDefs = getOnlyLatestDefs()

  const robotType = robot.model
  const trashSlot = robotType === FLEX_ROBOT_TYPE ? 'A3' : '12'
  const trashDefUri =
    robotType === FLEX_ROBOT_TYPE ? FLEX_TRASH_DEF_URI : OT_2_TRASH_DEF_URI

  const trashDefinition = allLatestDefs[trashDefUri]
  const trashId = `${uuid()}:${trashDefUri}`

  const trashLoadCommand = [
    {
      key: uuid(),
      commandType: 'loadLabware',
      params: {
        location: { slotName: trashSlot },
        version: 1,
        namespace: 'opentrons',
        loadName: trashDefinition.parameters.loadName,
        displayName: trashDefinition.metadata.displayName,
        labwareId: trashId,
      },
    },
  ] as LoadLabwareCreateCommand[]

  const newLabwareLocationUpdate: LabwareLocationUpdate = Object.keys(
    labwareLocationUpdate
  ).reduce((acc: LabwareLocationUpdate, labwareId: string) => {
    if (labwareId === 'fixedTrash') {
      acc[trashId] = trashSlot
    } else {
      acc[labwareId] = labwareLocationUpdate[labwareId]
    }
    return acc
  }, {})

  const migrateSavedStepForms = (
    savedStepForms: Record<string, any>
  ): Record<string, any> => {
    return mapValues(savedStepForms, stepForm => {
      if (stepForm.stepType === 'moveLiquid') {
        return {
          ...stepForm,
          blowout_location:
            stepForm.blowout_location === 'fixedTrash'
              ? trashId
              : stepForm.blowout_location,
          dropTip_location: trashId,
        }
      } else if (stepForm.stepType === 'mix') {
        return {
          ...stepForm,
          blowout_location:
            stepForm.blowout_location === 'fixedTrash'
              ? trashId
              : stepForm.blowout_location,
          dropTip_location: trashId,
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

  return {
    ...appData,
    designerApplication: {
      ...appData.designerApplication,
      version: PD_VERSION,
      data: {
        ...appData.designerApplication?.data,
        savedStepForms: {
          [INITIAL_DECK_SETUP_STEP_ID]: {
            ...appData.designerApplication?.data?.savedStepForms[
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
    labwareDefinitions: {
      ...{ [trashId]: trashDefinition },
      ...appData.labwareDefinitions,
    },
    commands: [...commands, ...trashLoadCommand],
  }
}
