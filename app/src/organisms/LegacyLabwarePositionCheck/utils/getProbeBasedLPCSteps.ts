import { isEqual } from 'lodash'
import { SECTIONS } from '../constants'
import { getLabwareDefURI, getPipetteNameSpecs } from '@opentrons/shared-data'
import { getLegacyLabwareLocationCombos } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/getLegacyLabwareLocationCombos'
import { getLabwareDefinitionsFromCommands } from '@opentrons/components'

import type {
  CompletedProtocolAnalysis,
  LoadedPipette,
} from '@opentrons/shared-data'
import type { LabwarePositionCheckStep, CheckPositionsStep } from '../types'
import type { LegacyLabwareLocationCombo } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/getLegacyLabwareLocationCombos'

function getPrimaryPipetteId(pipettes: LoadedPipette[]): string {
  if (pipettes.length < 1) {
    throw new Error(
      'no pipettes in protocol, cannot determine primary pipette for LPC'
    )
  }
  return pipettes.reduce((acc, pip) => {
    return (getPipetteNameSpecs(acc.pipetteName)?.channels ?? 0) >
      (getPipetteNameSpecs(pip.pipetteName)?.channels ?? 0)
      ? pip
      : acc
  }, pipettes[0]).id
}

export const getProbeBasedLPCSteps = (
  protocolData: CompletedProtocolAnalysis
): LabwarePositionCheckStep[] => {
  return [
    { section: SECTIONS.BEFORE_BEGINNING },
    {
      section: SECTIONS.ATTACH_PROBE,
      pipetteId: getPrimaryPipetteId(protocolData.pipettes),
    },
    ...getAllCheckSectionSteps(protocolData),
    {
      section: SECTIONS.DETACH_PROBE,
      pipetteId: getPrimaryPipetteId(protocolData.pipettes),
    },
    { section: SECTIONS.RESULTS_SUMMARY },
  ]
}

function getAllCheckSectionSteps(
  protocolData: CompletedProtocolAnalysis
): CheckPositionsStep[] {
  const { pipettes, commands, labware, modules = [] } = protocolData
  const labwareLocationCombos = getLegacyLabwareLocationCombos(
    commands,
    labware,
    modules
  )
  const labwareDefinitions = getLabwareDefinitionsFromCommands(commands)
  const labwareLocations = labwareLocationCombos.reduce<
    LegacyLabwareLocationCombo[]
  >((acc, labwareLocationCombo) => {
    const labwareDef = labwareDefinitions.find(
      def => getLabwareDefURI(def) === labwareLocationCombo.definitionUri
    )
    if (
      (labwareDef?.allowedRoles ?? []).includes('adapter') ||
      (labwareDef?.allowedRoles ?? []).includes('lid')
    ) {
      return acc
    }
    // remove duplicate definitionUri in same location
    const comboAlreadyExists = acc.some(
      accLocationCombo =>
        labwareLocationCombo.definitionUri === accLocationCombo.definitionUri &&
        isEqual(labwareLocationCombo.location, accLocationCombo.location)
    )
    return comboAlreadyExists ? acc : [...acc, labwareLocationCombo]
  }, [])

  return labwareLocations.map(
    ({ location, labwareId, moduleId, adapterId, definitionUri }) => ({
      section: SECTIONS.CHECK_POSITIONS,
      labwareId: labwareId,
      pipetteId: getPrimaryPipetteId(pipettes),
      location,
      moduleId,
      adapterId,
      definitionUri: definitionUri,
    })
  )
}
