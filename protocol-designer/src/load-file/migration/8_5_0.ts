import floor from 'lodash/floor'
import { PROTOCOL_DESIGNER_SOURCE } from '../../constants'
import { swatchColors } from '../../components/organisms/DefineLiquidsModal/swatchColors'
import { getMigratedPositionFromTop } from './utils/getMigrationPositionFromTop'
import { getAdditionalEquipmentLocationUpdate } from './utils/getAdditionalEquipmentLocationUpdate'
import { getEquipmentLoadInfoFromCommands } from './utils/getEquipmentLoadInfoFromCommands'
import type {
  LoadLabwareCreateCommand,
  ProtocolFile,
} from '@opentrons/shared-data'
import type { Ingredients } from '@opentrons/step-generation'
import type { DesignerApplicationData } from './utils/getLoadLiquidCommands'
import type { PDMetadata } from '../../file-types'

export const migrateFile = (
  appData: ProtocolFile<DesignerApplicationData>
): ProtocolFile<PDMetadata> => {
  const {
    designerApplication,
    commands,
    labwareDefinitions,
    liquids,
    robot,
  } = appData

  if (designerApplication == null || designerApplication?.data == null) {
    throw Error('The designerApplication key in your file is corrupt.')
  }
  const savedStepForms = designerApplication.data
    ?.savedStepForms as DesignerApplicationData['savedStepForms']

  const ingredients = designerApplication.data.ingredients

  const migratedIngredients: Ingredients = Object.entries(
    ingredients
  ).reduce<Ingredients>((acc, [id, ingredient]) => {
    acc[id] = {
      displayName: ingredient.name ?? '',
      liquidClass: ingredient.liquidClass,
      description: ingredient.description ?? null,
      liquidGroupId: id,
      displayColor: liquids[id].displayColor ?? swatchColors(id),
    }
    return acc
  }, {})

  const loadLabwareCommands = commands.filter(
    (command): command is LoadLabwareCreateCommand =>
      command.commandType === 'loadLabware'
  )

  const savedStepsWithUpdatedMoveLiquidFields = Object.values(
    savedStepForms
  ).reduce((acc, form) => {
    if (form.stepType === 'moveLiquid') {
      const {
        id,
        aspirate_touchTip_mmFromBottom,
        dispense_touchTip_mmFromBottom,
        aspirate_labware,
        dispense_labware,
        liquidClassesSupported,
        ...rest
      } = form
      const matchingAspirateLabwareWellDepth = getMigratedPositionFromTop(
        labwareDefinitions,
        loadLabwareCommands,
        aspirate_labware as string,
        'aspirate'
      )
      const matchingDispenseLabwareWellDepth = getMigratedPositionFromTop(
        labwareDefinitions,
        loadLabwareCommands,
        dispense_labware as string,
        'dispense'
      )

      return {
        ...acc,
        [id]: {
          ...rest,
          id,
          aspirate_labware,
          dispense_labware,
          aspirate_touchTip_mmFromTop:
            aspirate_touchTip_mmFromBottom == null
              ? null
              : floor(
                  aspirate_touchTip_mmFromBottom -
                    matchingAspirateLabwareWellDepth,
                  1
                ),
          dispense_touchTip_mmfromTop:
            dispense_touchTip_mmFromBottom == null
              ? null
              : floor(
                  dispense_touchTip_mmFromBottom -
                    matchingDispenseLabwareWellDepth,
                  1
                ),
          aspirate_retract_delay_seconds: null,
          dispense_retract_delay_seconds: null,
          aspirate_retract_speed: null,
          dispense_retract_speed: null,
          aspirate_submerge_delay_seconds: null,
          dispense_submerge_delay_seconds: null,
          aspirate_submerge_speed: null,
          dispense_submerge_speed: null,
          aspirate_touchTip_speed: null,
          dispense_touchTip_speed: null,
          aspirate_position_reference: null,
          aspirate_retract_position_reference: null,
          aspirate_submerge_mmFromBottom: null,
          aspirate_submerge_x_position: null,
          aspirate_submerge_y_position: null,
          aspirate_submerge_position_reference: null,
          dispense_position_reference: null,
          dispense_retract_position_reference: null,
          dispense_submerge_mmFromBottom: null,
          dispense_submerge_x_position: null,
          dispense_submerge_y_position: null,
          dispense_submerge_position_reference: null,
          liquidClassesSupported: liquidClassesSupported ?? false,
          liquidClass: null,
        },
      }
    }
    return acc
  }, {})

  const savedStepsWithUpdatedMixFields = Object.values(savedStepForms).reduce(
    (acc, form) => {
      if (form.stepType === 'mix') {
        const {
          id,
          mix_touchTip_mmFromBottom,
          labware,
          liquidClassesSupported,
          ...rest
        } = form
        const matchingLabwareWellDepth = getMigratedPositionFromTop(
          labwareDefinitions,
          loadLabwareCommands,
          labware as string,
          'mix'
        )
        return {
          ...acc,
          [id]: {
            ...rest,
            id,
            labware,
            mix_touchTip_mmFromTop:
              mix_touchTip_mmFromBottom == null
                ? null
                : floor(
                    mix_touchTip_mmFromBottom - matchingLabwareWellDepth,
                    1
                  ),
            liquidClassesSupported: liquidClassesSupported ?? false,
          },
        }
      }
      return acc
    },
    {}
  )

  const updatedInitialStep = Object.values(savedStepForms).reduce(
    (acc, form) => {
      const { id } = form
      if (id === '__INITIAL_DECK_SETUP_STEP__') {
        return {
          ...acc,
          [id]: {
            ...form,
            ...getAdditionalEquipmentLocationUpdate(
              commands,
              robot.model,
              savedStepForms
            ),
          },
        }
      }
      return acc
    },
    {}
  )
  const equipmentLoadInfoFromCommands = getEquipmentLoadInfoFromCommands(
    commands,
    labwareDefinitions
  )
  return {
    ...appData,
    metadata: {
      ...appData.metadata,
      source: PROTOCOL_DESIGNER_SOURCE,
    },
    designerApplication: {
      ...designerApplication,
      data: {
        ...designerApplication.data,
        ingredients: migratedIngredients,
        ...equipmentLoadInfoFromCommands,
        savedStepForms: {
          ...designerApplication.data.savedStepForms,
          ...updatedInitialStep,
          ...savedStepsWithUpdatedMoveLiquidFields,
          ...savedStepsWithUpdatedMixFields,
        },
      },
    },
  }
}
