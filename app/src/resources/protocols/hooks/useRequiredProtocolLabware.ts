import last from 'lodash/last'
import {
  useProtocolAnalysisAsDocumentQuery,
  useProtocolQuery,
} from '@opentrons/react-api-client'
import { getRequiredLabwareDetailsFromLoadCommands } from '/app/transformations/commands'
import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'
import type { RequiredLabwareDetails } from '/app/transformations/commands'
/**
 * Returns an array of RequiredLabwareDetails objects that are required by the given protocol ID.
 *
 * @param {string} protocolId The ID of the protocol for which required labware setup items are being retrieved.
 * @returns {RequiredLabwareDetails[]} An array of RequiredLabwareDetails objects that are required by the given protocol ID.
 */
export const useRequiredProtocolLabware = (
  protocolId: string
): RequiredLabwareDetails[] => {
  const { data: protocolData } = useProtocolQuery(protocolId)
  const {
    data: mostRecentAnalysis,
  } = useProtocolAnalysisAsDocumentQuery(
    protocolId,
    last(protocolData?.data.analysisSummaries)?.id ?? null,
    { enabled: protocolData != null }
  )
  const commands =
    (mostRecentAnalysis as CompletedProtocolAnalysis)?.commands ?? []
  const labwareDetails = getRequiredLabwareDetailsFromLoadCommands(commands)
  return labwareDetails
}
