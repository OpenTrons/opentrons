import { uuid } from '../../utils'
import { getOnlyLatestDefs } from '../../labware-defs'
import { INITIAL_DECK_SETUP_STEP_ID } from '../../constants'
import { getAdapterAndLabwareSplitInfo } from './utils/getAdapterAndLabwareSplitInfo'
import type {
  LabwareDefinitionsByUri,
  ProtocolFileV6,
} from '@opentrons/shared-data'
import type {
  LoadPipetteCreateCommand,
  LoadModuleCreateCommand,
  LoadLabwareCreateCommand,
  LoadAdapterCreateCommand,
  LabwareLocation,
  ProtocolFile,
} from '@opentrons/shared-data/protocol/types/schemaV7'
import type {
  LoadPipetteCreateCommand as LoadPipetteCommandV6,
  LoadModuleCreateCommand as LoadModuleCommandV6,
  LoadLabwareCreateCommand as LoadLabwareCommandV6,
} from '@opentrons/shared-data/protocol/types/schemaV6'
import type { DesignerApplicationData } from './utils/getLoadLiquidCommands'

// NOTE: this migration removes pipettes, labware, and modules as top level keys and adds necessary
// params to the load commands. Also, this introduces loadAdapter commands and migrates previous combined
//  adapter + labware commands and definitions to their commands/definitions split up
const PD_VERSION = '7.0.0'
const SCHEMA_VERSION = 7
interface LabwareLocationUpdate {
  [id: string]: string
}

//  might need better way to filter this???
const getIsAdapter = (id: string): boolean =>
  id.includes('opentrons_96_aluminumblock_biorad_wellplate_200ul') ||
  id.includes('adapter') ||
  id.includes('opentrons_96_aluminumblock_nest_wellplate_100ul')

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
  const orderedStepIds = appData.designerApplication?.data?.orderedStepIds
  const savedStepForms: any = appData.designerApplication?.data?.savedStepForms

  const allLatestDefs = getOnlyLatestDefs()

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

  const loadAdapterAndLabwareCommands: Array<
    LoadAdapterCreateCommand | LoadLabwareCreateCommand
  > = commands
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
      } = getAdapterAndLabwareSplitInfo(command.params.labwareId)
      const previousLabwareIdUuid = command.params.labwareId.split(':')[0]
      const labwareLocation = command.params.location
      let adapterLocation: LabwareLocation = 'offDeck'
      if (labwareLocation === 'offDeck') {
        adapterLocation = 'offDeck'
      } else if ('moduleId' in labwareLocation) {
        adapterLocation = { moduleId: labwareLocation.moduleId }
      } else if ('slotName' in labwareLocation) {
        adapterLocation = { slotName: labwareLocation.slotName }
      }
      const defUris = Object.keys(allLatestDefs)
      const adapterDefUri = defUris.find(defUri => defUri === adapterUri) ?? ''
      const labwareDefUri = defUris.find(defUri => defUri === labwareUri) ?? ''
      const adapterLoadname = allLatestDefs[adapterDefUri].parameters.loadName
      const labwareLoadname = allLatestDefs[labwareDefUri].parameters.loadName
      const adapterId = `${uuid()}:${adapterUri}`

      const loadAdapterCommand: LoadAdapterCreateCommand = {
        key: uuid(),
        commandType: 'loadAdapter',
        params: {
          adapterId,
          loadName: adapterLoadname,
          namespace: 'opentrons',
          version: 1,
          location: adapterLocation,
          displayName: adapterDisplayName,
        },
      }

      const loadLabwareCommand: LoadLabwareCreateCommand = {
        key: uuid(),
        commandType: 'loadLabware',
        params: {
          //  keeping same Uuid as previous id for ingredLocation and savedStepForms mapping
          labwareId: `${previousLabwareIdUuid}:${labwareUri}`,
          loadName: labwareLoadname,
          namespace: 'opentrons',
          version: 1,
          location: { labwareId: adapterId },
          displayName: labwareDisplayName,
        },
      }

      return [loadAdapterCommand, loadLabwareCommand]
    })

  const newLabwareDefinitions: LabwareDefinitionsByUri = Object.keys(
    labwareDefinitions
  ).reduce((acc: LabwareDefinitionsByUri, defId: string) => {
    if (!getIsAdapter(defId)) {
      acc[defId] = labwareDefinitions[defId]
    } else {
      const { adapterUri, labwareUri } = getAdapterAndLabwareSplitInfo(defId)
      const defUris = Object.keys(allLatestDefs)
      const adapterDefUri = defUris.find(defUri => defUri === adapterUri) ?? ''
      const labwareDefUri = defUris.find(defUri => defUri === labwareUri) ?? ''

      const adapterLabwareDef = allLatestDefs[adapterDefUri]
      const labwareDef = allLatestDefs[labwareDefUri]

      acc[adapterDefUri] = adapterLabwareDef
      acc[labwareDefUri] = labwareDef
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
      const { namespace, version } = labwareDefinitions[definitionId]
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
          loadName: definitionId,
          namespace,
          version,
          location,
          displayName: labware[labwareId].displayName,
        },
      }
    })
  const newLabwareLocationUpdate: LabwareLocationUpdate = Object.keys(
    labwareLocationUpdate
  ).reduce((acc: LabwareLocationUpdate, labwareId: string) => {
    if (!getIsAdapter(labwareId)) {
      acc[labwareId] = labwareLocationUpdate[labwareId]
    } else {
      const adapterAndLabwareLocationUpdate: LabwareLocationUpdate = Object.entries(
        loadAdapterAndLabwareCommands
      ).reduce(
        (
          adapterAndLabwareAcc: LabwareLocationUpdate,
          [id, command]: [
            string,
            LoadAdapterCreateCommand | LoadLabwareCreateCommand
          ]
        ) => {
          const { location } = command.params
          let labId: string = ''
          if ('adapterId' in command.params)
            labId = command.params.adapterId ?? ''
          else if ('labwareId' in command.params)
            labId = command.params.labwareId ?? ''

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
      Object.assign(acc, adapterAndLabwareLocationUpdate)
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
        const labwareIdUuid = labwareId.split(':')[0]
        const matchingCommand = loadAdapterAndLabwareCommands
          .filter(
            (command): command is LoadLabwareCreateCommand =>
              command.commandType === 'loadLabware'
          )
          .find(
            command => command.params.labwareId?.split(':')[0] === labwareIdUuid
          )
        const updatedLabwareId =
          matchingCommand != null ? matchingCommand.params.labwareId ?? '' : ''
        updatedIngredLocations[updatedLabwareId] = wellData
      } else {
        updatedIngredLocations[labwareId] = wellData
      }
    }
    return updatedIngredLocations
  }
  const newLabwareIngreds = getNewLabwareIngreds(ingredLocations)

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
          ...appData.designerApplication?.data?.savedStepForms,
          [INITIAL_DECK_SETUP_STEP_ID]: {
            ...appData.designerApplication?.data?.savedStepForms[
              INITIAL_DECK_SETUP_STEP_ID
            ],
            labwareLocationUpdate: {
              ...newLabwareLocationUpdate,
            },
          },
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
    ],
  }
}
