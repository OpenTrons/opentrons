import { getInitialAndMovedLabwareInSlots } from '@opentrons/components'
import { useDeckConfigurationQuery } from '@opentrons/react-api-client'
import {
  FLEX_ROBOT_TYPE,
  getAddressableAreasInProtocol,
  getCutoutFixturesForCutoutId,
  getCutoutIdForAddressableArea,
  getDeckDefFromRobotType,
  getLabwareDisplayName,
  SINGLE_LEFT_SLOT_FIXTURE,
  SINGLE_SLOT_FIXTURES,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'

import { getProtocolModulesInfo } from '../../organisms/Devices/ProtocolRun/utils/getProtocolModulesInfo'

import type {
  CompletedProtocolAnalysis,
  CutoutConfigProtocolSpec,
  CutoutFixtureId,
  ProtocolAnalysisOutput,
  RobotType,
} from '@opentrons/shared-data'

const DECK_CONFIG_REFETCH_INTERVAL = 5000

export interface CutoutConfigAndCompatibility extends CutoutConfigProtocolSpec {
  compatibleCutoutFixtureIds: CutoutFixtureId[]
  // the missing on-deck labware display name for a single slot cutout
  missingLabwareDisplayName: string | null
}
export function useDeckConfigurationCompatibility(
  robotType: RobotType,
  protocolAnalysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput | null
): CutoutConfigAndCompatibility[] {
  const deckConfig =
    useDeckConfigurationQuery({ refetchInterval: DECK_CONFIG_REFETCH_INTERVAL })
      .data ?? []
  if (robotType !== FLEX_ROBOT_TYPE) return []
  const deckDef = getDeckDefFromRobotType(robotType)
  const allAddressableAreas =
    protocolAnalysis != null
      ? getAddressableAreasInProtocol(protocolAnalysis, deckDef)
      : []
  const labwareInSlots =
    protocolAnalysis != null
      ? getInitialAndMovedLabwareInSlots(protocolAnalysis)
      : []

  const protocolModulesInfo =
    protocolAnalysis != null
      ? getProtocolModulesInfo(protocolAnalysis, deckDef)
      : []

  const hasThermocycler =
    protocolModulesInfo.find(
      protocolMod =>
        protocolMod.moduleDef.moduleType === THERMOCYCLER_MODULE_TYPE
    ) != null

  return deckConfig.reduce<CutoutConfigAndCompatibility[]>(
    (acc, { cutoutId, cutoutFixtureId }) => {
      const fixturesThatMountToCutoutId = getCutoutFixturesForCutoutId(
        cutoutId,
        deckDef.cutoutFixtures
      )
      const requiredAddressableAreasForCutoutId = allAddressableAreas.filter(
        aa =>
          getCutoutIdForAddressableArea(aa, fixturesThatMountToCutoutId) ===
          cutoutId
      )

      const compatibleCutoutFixtureIds = fixturesThatMountToCutoutId
        .filter(cf =>
          requiredAddressableAreasForCutoutId.every(aa =>
            cf.providesAddressableAreas[cutoutId].includes(aa)
          )
        )
        .map(cf => cf.id)

      // get the on-deck labware name for a missing single-slot addressable area
      const missingSingleSlotLabware =
        cutoutFixtureId != null &&
        // fixture mismatch
        !compatibleCutoutFixtureIds.includes(cutoutFixtureId) &&
        compatibleCutoutFixtureIds[0] != null &&
        // compatible fixture is single-slot
        SINGLE_SLOT_FIXTURES.includes(compatibleCutoutFixtureIds[0])
          ? labwareInSlots.find(
              ({ location }) =>
                // match the addressable area to an on-deck labware
                requiredAddressableAreasForCutoutId[0] === location.slotName
            )
          : null

      const missingLabwareDisplayName =
        missingSingleSlotLabware != null
          ? missingSingleSlotLabware.labwareNickName ??
            getLabwareDisplayName(missingSingleSlotLabware.labwareDef) ??
            null
          : null

      return [
        ...acc,
        {
          cutoutId,
          cutoutFixtureId,
          requiredAddressableAreas: requiredAddressableAreasForCutoutId,
          // Thermocycler requires an "empty" (single slot) fixture in A1 that is not referenced directly in protocol
          compatibleCutoutFixtureIds:
            hasThermocycler && cutoutId === 'cutoutA1'
              ? [SINGLE_LEFT_SLOT_FIXTURE]
              : compatibleCutoutFixtureIds,
          missingLabwareDisplayName,
        },
      ]
    },
    []
  )
}
