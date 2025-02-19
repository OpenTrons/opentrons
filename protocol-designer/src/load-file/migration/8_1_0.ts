import { getDefaultBlowoutFlowRate } from './utils/getDefaultBlowoutFlowRate'
import type {
  LoadPipetteCreateCommand,
  LoadLabwareCreateCommand,
  ProtocolFile,
  PipetteName,
} from '@opentrons/shared-data'
import type { LegacyDismissedWarningState } from '/protocol-designer/dismiss/reducers'
import type { DesignerApplicationData } from './utils/getLoadLiquidCommands'

export interface DesignerApplicationDataV8 {
  ingredients: Record<
    string,
    {
      name?: string | null
      description?: string | null
      serialize: boolean
    }
  >
  ingredLocations: {
    [labwareId: string]: {
      [wellName: string]: { [liquidId: string]: { volume: number } }
    }
  }
  savedStepForms: Record<string, any>
  orderedStepIds: string[]
  pipetteTiprackAssignments: Record<string, string>
  dismissedWarnings: LegacyDismissedWarningState
}

export const migrateFile = (
  appData: ProtocolFile<DesignerApplicationDataV8>
): ProtocolFile<DesignerApplicationData> => {
  const { designerApplication, commands, labwareDefinitions } = appData

  if (designerApplication == null || designerApplication?.data == null) {
    throw Error('The designerApplication key in your file is corrupt.')
  }

  const tiprackAssignments = designerApplication.data
    ?.pipetteTiprackAssignments as Record<string, string>

  const newTiprackAssignments = Object.keys(tiprackAssignments).reduce(
    (acc: Record<string, string[]>, key) => {
      acc[key] = [tiprackAssignments[key]]
      return acc
    },
    {}
  )

  const dismissedWarnings = designerApplication.data?.dismissedWarnings

  const pipetteTiprackAssignments =
    designerApplication.data?.pipetteTiprackAssignments

  const loadLabwareCommands = commands.filter(
    (command): command is LoadLabwareCreateCommand =>
      command.commandType === 'loadLabware'
  )
  const loadPipetteCommands = commands.filter(
    (command): command is LoadPipetteCreateCommand =>
      command.commandType === 'loadPipette'
  )

  const savedStepForms = designerApplication.data
    ?.savedStepForms as DesignerApplicationData['savedStepForms']
  const pipettingSavedSteps = Object.values(savedStepForms).filter(
    form => form.stepType === 'moveLiquid' || form.stepType === 'mix'
  )

  const pipettingSavedStepsWithAdditionalFields = pipettingSavedSteps.reduce(
    (acc, item) => {
      const tipRackUri = tiprackAssignments[item.pipette]
      const tiprackLoadName =
        labwareDefinitions[tipRackUri]?.parameters.loadName
      if (tiprackLoadName == null) {
        console.error(
          `expected to find tiprack definition with labwareDefintionURI ${tipRackUri} but could not`
        )
      }
      const tiprackLoadCommands = loadLabwareCommands.filter(
        command => command.params.loadName === tiprackLoadName
      )
      const tipRackDefURI = pipetteTiprackAssignments[item.pipette]

      const xyKeys =
        item.stepType === 'mix'
          ? { mix_x_position: 0, mix_y_position: 0 }
          : {
              aspirate_x_position: 0,
              aspirate_y_position: 0,
              dispense_x_position: 0,
              dispense_y_position: 0,
            }
      const matchingTiprackCommand = tiprackLoadCommands.find(command =>
        command.params.labwareId?.includes(tipRackDefURI)
      )
      if (matchingTiprackCommand == null) {
        console.error(
          `expected to find a tiprack loadname from tiprack ${tipRackDefURI} but could not `
        )
      }
      const matchingTiprackURI =
        matchingTiprackCommand != null
          ? `${matchingTiprackCommand.params.namespace}/${matchingTiprackCommand.params.loadName}/${matchingTiprackCommand.params.version}`
          : null
      const tipLength =
        matchingTiprackURI != null
          ? labwareDefinitions[matchingTiprackURI].parameters.tipLength ?? 0
          : 0
      const pipetteName = loadPipetteCommands.find(
        pipette => pipette.params.pipetteId === item.pipette
      )?.params.pipetteName

      const defaultBlowOutFlowRate = getDefaultBlowoutFlowRate(
        pipetteName as PipetteName,
        item.volume as number,
        tipLength
      )

      let blowoutFlowRate: number | null = defaultBlowOutFlowRate
      if (item.blowout_checkbox === false) {
        blowoutFlowRate = null
      }

      acc[item.id] = {
        ...item,
        blowout_flowRate: blowoutFlowRate,
        blowout_z_offset: 0,
        tipRack: tipRackDefURI,
        ...xyKeys,
      }
      return acc
    },
    {}
  )

  const newDismissedWarningsForm =
    dismissedWarnings.form != null
      ? Object.values(dismissedWarnings.form).flatMap(
          formType => formType as string[]
        )
      : []
  const newDismissedWarningsTimeline =
    dismissedWarnings.timeline != null
      ? Object.values(dismissedWarnings.timeline).flatMap(
          timelineType => timelineType as string[]
        )
      : []

  return {
    ...appData,
    designerApplication: {
      ...designerApplication,
      data: {
        ...designerApplication.data,
        savedStepForms: {
          ...designerApplication.data.savedStepForms,
          ...pipettingSavedStepsWithAdditionalFields,
        },
        pipetteTiprackAssignments: newTiprackAssignments,
        dismissedWarnings: {
          form: newDismissedWarningsForm,
          timeline: newDismissedWarningsTimeline,
        },
      },
    },
  }
}
