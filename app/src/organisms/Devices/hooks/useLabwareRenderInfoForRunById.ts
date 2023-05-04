import { useProtocolDetailsForRun, useStoredProtocolAnalysis } from '.'
import { useMostRecentCompletedAnalysis } from '../../LabwarePositionCheck/useMostRecentCompletedAnalysis'
import { getLabwareRenderInfo } from '../ProtocolRun/utils/getLabwareRenderInfo'
import type { LabwareRenderInfoById } from '../ProtocolRun/utils/getLabwareRenderInfo'
import { getDeckDefFromRobotType } from '@opentrons/shared-data'

export function useLabwareRenderInfoForRunById(
  runId: string
): LabwareRenderInfoById {
  const { robotType } = useProtocolDetailsForRun(runId)
  const robotProtocolAnalysis = useMostRecentCompletedAnalysis(runId)

  const storedProtocolAnalysis = useStoredProtocolAnalysis(runId)
  const protocolData = robotProtocolAnalysis ?? storedProtocolAnalysis
  const deckDef = getDeckDefFromRobotType(robotType)

  return protocolData != null ? getLabwareRenderInfo(protocolData, deckDef) : {}
}
