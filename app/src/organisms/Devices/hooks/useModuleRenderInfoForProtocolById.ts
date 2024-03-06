import {
  checkModuleCompatibility,
  FLEX_ROBOT_TYPE,
  getCutoutIdForSlotName,
  getDeckDefFromRobotType,
  MAGNETIC_BLOCK_TYPE,
  SINGLE_SLOT_FIXTURES,
  STAGING_AREA_RIGHT_SLOT_FIXTURE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import { useDeckConfigurationQuery } from '@opentrons/react-api-client/src/deck_configuration'

import { getProtocolModulesInfo } from '../ProtocolRun/utils/getProtocolModulesInfo'
import { useMostRecentCompletedAnalysis } from '../../LabwarePositionCheck/useMostRecentCompletedAnalysis'
import { useAttachedModules } from './useAttachedModules'
import { useStoredProtocolAnalysis } from './useStoredProtocolAnalysis'

import type { CutoutConfig } from '@opentrons/shared-data'
import type { AttachedModule } from '../../../redux/modules/types'
import type { ProtocolModuleInfo } from '../ProtocolRun/utils/getProtocolModulesInfo'

export interface ModuleRenderInfoForProtocol extends ProtocolModuleInfo {
  attachedModuleMatch: AttachedModule | null
  conflictedFixture: CutoutConfig | null
}

export interface ModuleRenderInfoById {
  [moduleId: string]: ModuleRenderInfoForProtocol
}

const REFETCH_INTERVAL_5000_MS = 5000

export function useModuleRenderInfoForProtocolById(
  runId: string,
  pollModules?: boolean
): ModuleRenderInfoById {
  const robotProtocolAnalysis = useMostRecentCompletedAnalysis(runId)
  const { data: deckConfig } = useDeckConfigurationQuery({
    refetchInterval: REFETCH_INTERVAL_5000_MS,
  })
  const storedProtocolAnalysis = useStoredProtocolAnalysis(runId)
  const protocolAnalysis = robotProtocolAnalysis ?? storedProtocolAnalysis
  const attachedModules = useAttachedModules({
    refetchInterval: pollModules ? REFETCH_INTERVAL_5000_MS : false,
  })
  if (protocolAnalysis == null) return {}

  const deckDef = getDeckDefFromRobotType(
    protocolAnalysis.robotType ?? FLEX_ROBOT_TYPE
  )

  const protocolModulesInfo = getProtocolModulesInfo(protocolAnalysis, deckDef)

  const protocolModulesInfoInLoadOrder = protocolModulesInfo.sort(
    (modA, modB) => modA.protocolLoadOrder - modB.protocolLoadOrder
  )
  let matchedAmod: AttachedModule[] = []
  const allModuleRenderInfo = protocolModulesInfoInLoadOrder.map(
    protocolMod => {
      const compatibleAttachedModule =
        attachedModules.find(
          attachedMod =>
            checkModuleCompatibility(
              attachedMod.moduleModel,
              protocolMod.moduleDef.model
            ) && !matchedAmod.find(m => m === attachedMod)
        ) ?? null

      const cutoutIdForSlotName = getCutoutIdForSlotName(
        protocolMod.slotName,
        deckDef
      )

      const isMagneticBlockModule =
        protocolMod.moduleDef.moduleType === MAGNETIC_BLOCK_TYPE

      const isThermocycler =
        protocolMod.moduleDef.moduleType === THERMOCYCLER_MODULE_TYPE

      const conflictedFixture =
        deckConfig?.find(
          fixture =>
            (fixture.cutoutId === cutoutIdForSlotName ||
              // special-case A1 for the thermocycler to require a single slot fixture
              (isThermocycler && fixture.cutoutId === 'cutoutA1')) &&
            fixture.cutoutFixtureId != null &&
            // do not generate a conflict for single slot fixtures, because modules are not yet fixtures
            !SINGLE_SLOT_FIXTURES.includes(fixture.cutoutFixtureId) &&
            // special case the magnetic module because unlike other modules it sits in a slot that can also be provided by a staging area fixture
            (!isMagneticBlockModule ||
              fixture.cutoutFixtureId !== STAGING_AREA_RIGHT_SLOT_FIXTURE)
        ) ?? null

      if (compatibleAttachedModule !== null) {
        matchedAmod = [...matchedAmod, compatibleAttachedModule]
        return {
          ...protocolMod,
          attachedModuleMatch: compatibleAttachedModule,
          conflictedFixture,
        }
      }
      return {
        ...protocolMod,
        attachedModuleMatch: null,
        conflictedFixture,
      }
    }
  )
  return allModuleRenderInfo.reduce(
    (acc, moduleInfo) => ({
      ...acc,
      [moduleInfo.moduleId]: moduleInfo,
    }),
    {}
  )
}
