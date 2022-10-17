import { IDENTITY_VECTOR } from '@opentrons/shared-data'
import { useCreateLabwareOffsetMutation } from '@opentrons/react-api-client'
import { useProtocolDetailsForRun } from '../../Devices/hooks'
import { getLabwareDefinitionUri } from '../../Devices/ProtocolRun/utils/getLabwareDefinitionUri'
import { getLabwareOffsetLocation } from '../../Devices/ProtocolRun/utils/getLabwareOffsetLocation'
import { useCurrentRunId } from '../../ProtocolUpload/hooks'

export function useClearAllOffsetsForCurrentRun(): () => void {
  const currentRunId = useCurrentRunId()
  const { protocolData } = useProtocolDetailsForRun(currentRunId)
  const { createLabwareOffset } = useCreateLabwareOffsetMutation()

  return () => {
    if (currentRunId == null || protocolData == null) return
    //  @ts-expect-error
    protocolData.labware.forEach(item => {
      createLabwareOffset({
        runId: currentRunId,
        data: {
          definitionUri: getLabwareDefinitionUri(
            item.id,
            protocolData.labware,
            protocolData.labwareDefinitions
          ),
          location: getLabwareOffsetLocation(
            item.id,
            protocolData.commands,
            protocolData.modules
          ),
          vector: IDENTITY_VECTOR,
        },
      }).catch((e: Error) => {
        console.error(`error clearing labware offsets: ${e.message}`)
      })
    })
  }
}
