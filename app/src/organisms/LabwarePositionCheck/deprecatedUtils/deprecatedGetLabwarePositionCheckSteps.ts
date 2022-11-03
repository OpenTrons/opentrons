import omitBy from 'lodash/omitBy'
import values from 'lodash/values'
import { deprecatedGetPrimaryPipetteId } from './deprecatedGetPrimaryPipetteId'
import { getPipetteWorkflow } from './getPipetteWorkflow'
import { getOnePipettePositionCheckSteps } from './getOnePipettePositionCheckSteps'
import { getTwoPipettePositionCheckSteps } from './getTwoPipettePositionCheckSteps'
import type {
  RunTimeCommand,
  ProtocolAnalysisFile,
} from '@opentrons/shared-data/protocol/types/schemaV6'
import type { DeprecatedLabwarePositionCheckStep } from '../types'

export const deprecatedGetLabwarePositionCheckSteps = (
  protocolData: ProtocolAnalysisFile
): DeprecatedLabwarePositionCheckStep[] => {
  if (protocolData != null && 'pipettes' in protocolData) {
    // filter out any pipettes that are not being used in the protocol
    const pipettesById: ProtocolAnalysisFile['pipettes'] = omitBy(
      protocolData.pipettes,
      (_pipette, id) =>
        !protocolData.commands.some(
          command =>
            command.commandType === 'pickUpTip' &&
            command.params.pipetteId === id
        )
    )
    const pipettes = values(pipettesById)
    const pipetteNames = pipettes.map(({ name }) => name)
    const labware = omitBy(
      protocolData.labware,
      (labware, id) =>
        protocolData.labwareDefinitions[labware.definitionId]?.parameters
          .isTiprack &&
        !protocolData.commands.some(
          command =>
            command.commandType === 'pickUpTip' &&
            command.params.labwareId === id
        )
    )
    const modules: ProtocolAnalysisFile['modules'] = protocolData.modules
    const labwareDefinitions = protocolData.labwareDefinitions
    const commands: RunTimeCommand[] = protocolData.commands
    const primaryPipetteId = deprecatedGetPrimaryPipetteId(
      pipettesById,
      commands
    )
    const pipetteWorkflow = getPipetteWorkflow({
      pipetteNames,
      primaryPipetteId,
      labware,
      labwareDefinitions,
      commands,
    })

    if (pipetteWorkflow === 1) {
      return getOnePipettePositionCheckSteps({
        primaryPipetteId,
        labware,
        labwareDefinitions,
        modules,
        commands,
      })
    } else {
      const secondaryPipetteId = Object.keys(pipettesById).find(
        pipetteId => pipetteId !== primaryPipetteId
      ) as string

      return getTwoPipettePositionCheckSteps({
        primaryPipetteId,
        secondaryPipetteId,
        labware,
        labwareDefinitions,
        modules,
        commands,
      })
    }
  }
  console.error('expected pipettes to be in protocol data')
  return []
}
