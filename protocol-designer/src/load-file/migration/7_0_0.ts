import mapValues from 'lodash/mapValues'
import { uuid } from '/protocol-designer/utils'
import { getOnlyLatestDefs } from '/protocol-designer/labware-defs'
import { INITIAL_DECK_SETUP_STEP_ID } from '/protocol-designer/constants'
import { getAdapterAndLabwareSplitInfo } from './utils/getAdapterAndLabwareSplitInfo'
import type {
  LabwareDefinition2,
  LabwareDefinitionsByUri,
  LoadLiquidCreateCommand,
  ProtocolFileV6,
} from '@opentrons/shared-data'
import type {
  LoadPipetteCreateCommand,
  LoadModuleCreateCommand,
  LoadLabwareCreateCommand,
  LabwareLocation,
  ProtocolFile,
} from '@opentrons/shared-data/protocol/types/schemaV7'
import type {
  LoadPipetteCreateCommand as LoadPipetteCommandV6,
  LoadModuleCreateCommand as LoadModuleCommandV6,
  LoadLabwareCreateCommand as LoadLabwareCommandV6,
  LoadLiquidCreateCommand as LoadLiquidCommandV6,
} from '@opentrons/shared-data/protocol/types/schemaV6'
import type { DesignerApplicationData } from './utils/getLoadLiquidCommands'

// NOTE: this migration removes pipettes, labware, and modules as top level keys and adds necessary
// params to the load commands. Also, this migrates previous combined
//  adapter + labware commands to all labware commands and definitions to their commands/definitions split up
//  as well as removing touch_tip commands from labware where touch_tip is incompatible
const PD_VERSION = '7.0.0'
const SCHEMA_VERSION = 7
interface LabwareLocationUpdate {
  [id: string]: string
}

const ADAPTER_LABWARE_COMBO_LOAD_NAMES = [
  'opentrons_96_deep_well_adapter_nest_wellplate_2ml_deep',
  'opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat',
  'opentrons_96_pcr_adapter_nest_wellplate_100ul_pcr_full_skirt',
  'opentrons_universal_flat_adapter_corning_384_wellplate_112ul_flat',
  'opentrons_96_aluminumblock_biorad_wellplate_200ul',
  'opentrons_96_aluminumblock_nest_wellplate_100ul',
]

interface LabwareIdMapping {
  [oldLabwareAdapterComboId: string]: {
    newLabwareId: string
    newAdapterId: string
    newLabwareDefinitionUri: string
  }
}

export const migrateFile = (
  appData: ProtocolFileV6<DesignerApplicationData>
): ProtocolFile => {
  const { commands, labwareDefinitions } = appData
  const { pipettes, labware, modules, ...rest } = appData
  const labwareLocationUpdate: LabwareLocationUpdate =
    appData.designerApplication?.data?.savedStepForms[
      INITIAL_DECK_SETUP_STEP_ID
    ].labwareLocationUpdate
  const ingredLocations = appData.designerApplication?.data?.ingredLocations

  const allLatestDefs = getOnlyLatestDefs()

  const getIsAdapter = (labwareId: string): boolean => {
    const labwareEntity = labware[labwareId]
    if (labwareEntity == null) {
      console.error(
        `expected to find labware entity with labwareId ${labwareId} but could not`
      )
      return false
    }
    const loadName =
      labwareDefinitions[labwareEntity.definitionId].parameters.loadName
    return ADAPTER_LABWARE_COMBO_LOAD_NAMES.includes(loadName)
  }

  const mappedLabwareIds = Object.keys(labware)
    .filter(labwareId => getIsAdapter(labwareId))
    .reduce((acc: LabwareIdMapping, labwareId: string): LabwareIdMapping => {
      const { labwareUri, adapterUri } = getAdapterAndLabwareSplitInfo(
        labware[labwareId].definitionId
      )
      const newLabwareId = `${uuid()}:${labwareUri}`
      const newAdapterId = `${uuid()}:${adapterUri}`

      return {
        ...acc,
        [labwareId]: {
          newLabwareId,
          newAdapterId,
          newLabwareDefinitionUri: labwareUri,
        },
      }
    }, {})

  const loadPipetteCommands: LoadPipetteCreateCommand[] = commands
    .filter(
      (command): command is LoadPipetteCommandV6 =>
        command.commandType === 'loadPipette'
    )
    .map(command => ({
      ...command,
      params: {
        ...command.params,
        pipetteName: pipettes[command.params.pipetteId].name,
      },
    }))

  const loadModuleCommands: LoadModuleCreateCommand[] = commands
    .filter(
      (command): command is LoadModuleCommandV6 =>
        command.commandType === 'loadModule'
    )
    .map(command => ({
      ...command,
      params: {
        ...command.params,
        model: modules[command.params.moduleId].model,
      },
    }))

  const loadAdapterAndLabwareCommands: LoadLabwareCreateCommand[] = commands
    .filter(
      (command): command is LoadLabwareCommandV6 =>
        command.commandType === 'loadLabware' &&
        getIsAdapter(command.params.labwareId)
    )
    .flatMap(command => {
      const {
        adapterUri,
        labwareUri,
        adapterDisplayName,
        labwareDisplayName,
      } = getAdapterAndLabwareSplitInfo(
        labware[command.params.labwareId].definitionId
      )
      const labwareLocation = command.params.location
      let adapterLocation: LabwareLocation = 'offDeck'
      if (labwareLocation === 'offDeck') {
        adapterLocation = 'offDeck'
      } else if ('moduleId' in labwareLocation) {
        adapterLocation = { moduleId: labwareLocation.moduleId }
      } else if ('slotName' in labwareLocation) {
        adapterLocation = { slotName: labwareLocation.slotName }
      }
      const {
        parameters: adapterParameters,
        version: adapterVersion,
      } = allLatestDefs[adapterUri]
      const {
        parameters: labwareParameters,
        version: labwareVersion,
      } = allLatestDefs[labwareUri]
      const adapterId = mappedLabwareIds[command.params.labwareId].newAdapterId

      const loadAdapterCommand: LoadLabwareCreateCommand = {
        key: uuid(),
        commandType: 'loadLabware',
        params: {
          labwareId: adapterId,
          loadName: adapterParameters.loadName,
          namespace: 'opentrons',
          version: adapterVersion,
          location: adapterLocation,
          displayName: adapterDisplayName,
        },
      }

      const loadLabwareCommand: LoadLabwareCreateCommand = {
        key: uuid(),
        commandType: 'loadLabware',
        params: {
          labwareId: mappedLabwareIds[command.params.labwareId].newLabwareId,
          loadName: labwareParameters.loadName,
          namespace: 'opentrons',
          version: labwareVersion,
          location: { labwareId: adapterId },
          displayName: labwareDisplayName,
        },
      }

      return [loadAdapterCommand, loadLabwareCommand]
    })
  const newLabwareDefinitions: LabwareDefinitionsByUri = Object.keys(
    labwareDefinitions
  ).reduce((acc: LabwareDefinitionsByUri, defId: string) => {
    const labwareDefinition = labwareDefinitions[defId]
    if (labwareDefinition == null) {
      console.error(
        `expected to find matching labware definition with definitionURI ${defId} but could not`
      )
    }
    const loadName = labwareDefinition.parameters.loadName
    if (ADAPTER_LABWARE_COMBO_LOAD_NAMES.includes(loadName)) {
      const { adapterUri, labwareUri } = getAdapterAndLabwareSplitInfo(defId)
      const adapterLabwareDef = allLatestDefs[adapterUri]
      const labwareDef = allLatestDefs[labwareUri]
      acc[adapterUri] = adapterLabwareDef
      acc[labwareUri] = labwareDef
    } else {
      acc[defId] = labwareDefinitions[defId]
    }
    return acc
  }, {})

  const loadLabwareCommands: LoadLabwareCreateCommand[] = commands
    .filter(
      (command): command is LoadLabwareCommandV6 =>
        command.commandType === 'loadLabware' &&
        getIsAdapter(command.params.labwareId) === false
    )
    .map(command => {
      const labwareId = command.params.labwareId
      const definitionId = labware[labwareId].definitionId
      const { namespace, version, parameters } = labwareDefinitions[
        definitionId
      ]
      const labwareLocation = command.params.location
      let location: LabwareLocation = 'offDeck'
      if (labwareLocation === 'offDeck') {
        location = 'offDeck'
      } else if ('moduleId' in labwareLocation) {
        location = { moduleId: labwareLocation.moduleId }
      } else if ('slotName' in labwareLocation) {
        location = { slotName: labwareLocation.slotName }
      }

      return {
        ...command,
        params: {
          ...command.params,
          labwareId:
            labwareId.includes(definitionId) || labwareId === 'fixedTrash'
              ? labwareId
              : `${labwareId}:${definitionId}`,
          loadName: parameters.loadName,
          namespace,
          version,
          location,
          displayName: labware[labwareId].displayName,
        },
      }
    })

  const loadLiquidCommands: LoadLiquidCreateCommand[] = commands
    .filter(
      (command): command is LoadLiquidCommandV6 =>
        command.commandType === 'loadLiquid'
    )
    .map(command => {
      const labwareId = command.params.labwareId
      const definitionId = labware[labwareId].definitionId
      return {
        ...command,
        params: {
          ...command.params,
          labwareId: labwareId.includes(definitionId)
            ? labwareId
            : `${labwareId}:${definitionId}`,
        },
      }
    })

  const newLabwareLocationUpdate: LabwareLocationUpdate = Object.keys(
    labwareLocationUpdate
  ).reduce((acc: LabwareLocationUpdate, labwareId: string) => {
    if (!getIsAdapter(labwareId)) {
      const definitionId = labware[labwareId].definitionId
      const labId =
        labwareId.includes(definitionId) || labwareId === 'fixedTrash'
          ? labwareId
          : `${labwareId}:${definitionId}`
      acc[labId] = labwareLocationUpdate[labwareId]
    } else {
      const adapterAndLabwareLocationUpdate: LabwareLocationUpdate = Object.entries(
        loadAdapterAndLabwareCommands
      ).reduce(
        (
          adapterAndLabwareAcc: LabwareLocationUpdate,
          [id, command]: [string, LoadLabwareCreateCommand]
        ) => {
          const { location, labwareId } = command.params
          const labId = labwareId ?? ''

          let locationString = ''
          if (location === 'offDeck') {
            locationString = 'offDeck'
          } else if ('moduleId' in location) {
            locationString = location.moduleId
          } else if ('slotName' in location) {
            locationString = location.slotName
          } else if ('labwareId' in location) {
            locationString = location.labwareId
          }
          adapterAndLabwareAcc[labId] = locationString
          return adapterAndLabwareAcc
        },
        {}
      )
      acc = { ...acc, ...adapterAndLabwareLocationUpdate }
    }
    return acc
  }, {})

  const getNewLabwareIngreds = (
    ingredLocations?: DesignerApplicationData['ingredLocations']
  ): DesignerApplicationData['ingredLocations'] => {
    const updatedIngredLocations: DesignerApplicationData['ingredLocations'] = {}
    if (ingredLocations == null) return {}
    for (const [labwareId, wellData] of Object.entries(ingredLocations)) {
      if (getIsAdapter(labwareId)) {
        const newLabwareId = mappedLabwareIds[labwareId].newLabwareId
        updatedIngredLocations[newLabwareId] = wellData
      } else {
        const definitionId = labware[labwareId].definitionId
        const newLabwareId = labwareId.includes(definitionId)
          ? labwareId
          : `${labwareId}:${definitionId}`
        updatedIngredLocations[newLabwareId] = wellData
      }
    }
    return updatedIngredLocations
  }
  const newLabwareIngreds = getNewLabwareIngreds(ingredLocations)
  const migrateSavedStepForms = (
    savedStepForms: Record<string, any>
  ): Record<string, any> => {
    return mapValues(savedStepForms, stepForm => {
      if (stepForm.stepType === 'moveLiquid') {
        let newAspirateLabwareDefinition: LabwareDefinition2 | null = null

        let aspirateLabware: string
        // aspirate labware is an adapter/labware split
        if (stepForm.aspirate_labware in mappedLabwareIds) {
          const newLabwareDefUri =
            mappedLabwareIds[stepForm.aspirate_labware].newLabwareDefinitionUri

          newAspirateLabwareDefinition = newLabwareDefinitions[newLabwareDefUri]
          aspirateLabware =
            mappedLabwareIds[stepForm.aspirate_labware].newLabwareId
          // aspirate labware is just a labware and doesn't need to be mapped
        } else {
          const aspirateDefinitionId =
            labware[stepForm.aspirate_labware].definitionId
          newAspirateLabwareDefinition =
            newLabwareDefinitions[aspirateDefinitionId]
          aspirateLabware =
            stepForm.aspirate_labware.includes(aspirateDefinitionId) ||
            stepForm.aspirate_labware === 'fixedTrash'
              ? stepForm.aspirate_labware
              : `${stepForm.aspirate_labware}:${aspirateDefinitionId}`
        }
        if (newAspirateLabwareDefinition == null) {
          console.error(
            `expected to find aspirate labware definition with labwareId ${aspirateLabware} but could not`
          )
        }

        const aspirateTouchTipIncompatible = newAspirateLabwareDefinition?.parameters.quirks?.includes(
          'touchTipDisabled'
        )

        let newDispenseLabwareDefinition: LabwareDefinition2 | null = null

        let dispenseLabware: string
        // dispense labware is an adapter/labware split
        if (stepForm.dispense_labware in mappedLabwareIds) {
          const labwareUri =
            mappedLabwareIds[stepForm.dispense_labware].newLabwareDefinitionUri
          newDispenseLabwareDefinition = newLabwareDefinitions[labwareUri]
          dispenseLabware =
            mappedLabwareIds[stepForm.dispense_labware].newLabwareId
          // dispense labware is just a labware and doesn't need to be mapped
        } else {
          const dispenseDefinitionId =
            labware[stepForm.dispense_labware].definitionId
          newDispenseLabwareDefinition =
            newLabwareDefinitions[dispenseDefinitionId]
          dispenseLabware =
            stepForm.dispense_labware.includes(dispenseDefinitionId) ||
            stepForm.dispense_labware === 'fixedTrash'
              ? stepForm.dispense_labware
              : `${stepForm.dispense_labware}:${dispenseDefinitionId}`
        }

        if (newDispenseLabwareDefinition == null) {
          console.error(
            `expected to find dispense labware definition with labwareId ${dispenseLabware} but could not`
          )
        }
        const dispenseTouchTipIncompatible = newDispenseLabwareDefinition?.parameters.quirks?.includes(
          'touchTipDisabled'
        )
        return {
          ...stepForm,
          dispense_labware: dispenseLabware,
          aspirate_labware: aspirateLabware,
          aspirate_touchTip_checkbox: aspirateTouchTipIncompatible
            ? false
            : stepForm.aspirate_touchTip_checkbox ?? false,
          aspirate_touchTip_mmFromBottom: aspirateTouchTipIncompatible
            ? null
            : stepForm.aspirate_touchTip_mmFromBottom ?? null,
          dispense_touchTip_checkbox: dispenseTouchTipIncompatible
            ? false
            : stepForm.dispense_touchTip_checkbox ?? false,
          dispense_touchTip_mmFromBottom: dispenseTouchTipIncompatible
            ? null
            : stepForm.dispense_touchTip_mmFromBottom ?? null,
        }
      } else if (stepForm.stepType === 'mix') {
        let newMixLabwareDefinition: LabwareDefinition2 | null = null

        let mixLabware: string
        // mix labware is an adapter/labware split
        if (stepForm.labware in mappedLabwareIds) {
          const labwareUri =
            mappedLabwareIds[stepForm.labware].newLabwareDefinitionUri
          newMixLabwareDefinition = newLabwareDefinitions[labwareUri]
          mixLabware = mappedLabwareIds[stepForm.labware].newLabwareId
          // mix labware is just a labware and doesn't need to be mapped
        } else {
          const mixDefinitionId = labware[stepForm.labware].definitionId
          newMixLabwareDefinition = newLabwareDefinitions[mixDefinitionId]
          mixLabware =
            stepForm.labware.includes(mixDefinitionId) ||
            stepForm.labware === 'fixedTrash'
              ? stepForm.labware
              : `${stepForm.labware}:${mixDefinitionId}`
        }

        if (newMixLabwareDefinition == null) {
          console.error(
            `expected to find mix labware definition with labwareId ${mixLabware} but could not`
          )
        }

        const mixTouchTipIncompatible = newMixLabwareDefinition?.parameters.quirks?.includes(
          'touchTipDisabled'
        )

        return {
          ...stepForm,
          labware: mixLabware,
          mix_touchTip_checkbox: mixTouchTipIncompatible
            ? false
            : stepForm.mix_touchTip_checkbox ?? false,
          mix_touchTip_mmFromBottom: mixTouchTipIncompatible
            ? null
            : stepForm.mix_touchTip_mmFromBottom ?? null,
        }
      }

      return stepForm
    })
  }
  const filteredavedStepForms = Object.fromEntries(
    Object.entries(
      appData.designerApplication?.data?.savedStepForms ?? {}
    ).filter(([key, value]) => key !== INITIAL_DECK_SETUP_STEP_ID)
  )
  const newFilteredavedStepForms = migrateSavedStepForms(filteredavedStepForms)

  return {
    ...rest,
    designerApplication: {
      ...appData.designerApplication,
      version: PD_VERSION,
      data: {
        ...appData.designerApplication?.data,
        ingredLocations: {
          ...newLabwareIngreds,
        },
        savedStepForms: {
          [INITIAL_DECK_SETUP_STEP_ID]: {
            ...appData.designerApplication?.data?.savedStepForms[
              INITIAL_DECK_SETUP_STEP_ID
            ],
            labwareLocationUpdate: {
              ...newLabwareLocationUpdate,
            },
          },
          ...newFilteredavedStepForms,
        },
      },
    },
    schemaVersion: SCHEMA_VERSION,
    $otSharedSchema: '#/protocol/schemas/7',
    labwareDefinitions: {
      ...newLabwareDefinitions,
    },
    commands: [
      ...loadPipetteCommands,
      ...loadModuleCommands,
      ...loadAdapterAndLabwareCommands,
      ...loadLabwareCommands,
      ...loadLiquidCommands,
    ],
  }
}
