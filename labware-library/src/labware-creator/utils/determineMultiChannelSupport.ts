import {
  LabwareDefinition2,
  getWellNamePerMultiTip,
} from '@opentrons/shared-data'

interface MultiChannelSupportResult {
  disablePipetteField: boolean
  allowMultiChannel: boolean
}

export const determineMultiChannelSupport = (
  def: LabwareDefinition2 | null
): MultiChannelSupportResult => {
  const disablePipetteField = def === null

  // allow multichannel pipette options only if
  // all 8 channels fit into the first column correctly
  const multiChannelTipsFirstColumn =
    def !== null ? getWellNamePerMultiTip(def, 'A1') : null

  const allowMultiChannel =
    multiChannelTipsFirstColumn !== null &&
    multiChannelTipsFirstColumn.length === 8

  return { disablePipetteField, allowMultiChannel }
}
