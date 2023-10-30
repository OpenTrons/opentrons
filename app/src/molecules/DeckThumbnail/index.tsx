import * as React from 'react'
import map from 'lodash/map'

import { BaseDeck, EXTENDED_DECK_CONFIG_FIXTURE } from '@opentrons/components'
import {
  getDeckDefFromRobotType,
  getRobotTypeFromLoadedLabware,
  THERMOCYCLER_MODULE_V1,
} from '@opentrons/shared-data'
import { parseInitialLoadedLabwareByAdapter } from '@opentrons/api-client'

import { useFeatureFlag } from '../../redux/config'
import { getStandardDeckViewLayerBlockList } from './utils/getStandardDeckViewLayerBlockList'
import { getDeckConfigFromProtocolCommands } from '../../resources/deck_configuration/utils'
import { getLabwareRenderInfo } from '../../organisms/Devices/ProtocolRun/utils/getLabwareRenderInfo'
import { getProtocolModulesInfo } from '../../organisms/Devices/ProtocolRun/utils/getProtocolModulesInfo'
import { useAttachedModules } from '../../organisms/Devices/hooks'
import { getAttachedProtocolModuleMatches } from '../../organisms/ProtocolSetupModulesAndDeck/utils'

import type { StyleProps } from '@opentrons/components'
import type {
  CompletedProtocolAnalysis,
  Liquid,
  LoadedLabware,
  ProtocolAnalysisOutput,
  RunTimeCommand,
} from '@opentrons/shared-data'

const ATTACHED_MODULE_POLL_MS = 5000

interface DeckThumbnailProps extends StyleProps {
  protocolAnalysis?: CompletedProtocolAnalysis | ProtocolAnalysisOutput | null
  commands: RunTimeCommand[]
  labware: LoadedLabware[]
  liquids?: Liquid[]
}

export function DeckThumbnail(props: DeckThumbnailProps): JSX.Element {
  const {
    protocolAnalysis,
    commands,
    liquids,
    labware = [],
    ...styleProps
  } = props
  const robotType = getRobotTypeFromLoadedLabware(labware)
  const deckDef = getDeckDefFromRobotType(robotType)
  const initialLoadedLabwareByAdapter = parseInitialLoadedLabwareByAdapter(
    commands
  )
  const attachedModules =
    useAttachedModules({
      refetchInterval: ATTACHED_MODULE_POLL_MS,
    }) ?? []

  const enableDeckConfig = useFeatureFlag('enableDeckConfiguration')
  const deckConfig = enableDeckConfig
    ? EXTENDED_DECK_CONFIG_FIXTURE
    : getDeckConfigFromProtocolCommands(commands)

  const labwareRenderInfo =
    protocolAnalysis != null
      ? getLabwareRenderInfo(protocolAnalysis, deckDef)
      : {}
  const protocolModulesInfo =
    protocolAnalysis != null
      ? getProtocolModulesInfo(protocolAnalysis, deckDef)
      : []
  const attachedProtocolModuleMatches = getAttachedProtocolModuleMatches(
    attachedModules,
    protocolModulesInfo
  )

  const moduleLocations = attachedProtocolModuleMatches.map(module => {
    const labwareInAdapterInMod =
      module.nestedLabwareId != null
        ? initialLoadedLabwareByAdapter[module.nestedLabwareId]
        : null
    //  only rendering the labware on top most layer so
    //  either the adapter or the labware are rendered but not both
    const topLabwareDefinition =
      labwareInAdapterInMod?.result?.definition ?? module.nestedLabwareDef
    return {
      moduleModel: module.moduleDef.model,
      moduleLocation: { slotName: module.slotName },
      innerProps:
        module.moduleDef.model === THERMOCYCLER_MODULE_V1
          ? { lidMotorState: 'open' }
          : {},
      nestedLabwareDef: topLabwareDefinition,
    }
  })

  const labwareLocations = map(
    labwareRenderInfo,
    ({ labwareDef, displayName, slotName }, labwareId) => {
      const labwareInAdapter = initialLoadedLabwareByAdapter[labwareId]
      //  only rendering the labware on top most layer so
      //  either the adapter or the labware are rendered but not both
      const topLabwareDefinition =
        labwareInAdapter?.result?.definition ?? labwareDef
      const topLabwareId = labwareInAdapter?.result?.labwareId ?? labwareId
      const topLabwareDisplayName =
        labwareInAdapter?.params.displayName ?? displayName

      return {
        labwareLocation: { slotName },
        definition: topLabwareDefinition,
        topLabwareId,
        topLabwareDisplayName,
      }
    }
  )

  return (
    <BaseDeck
      deckConfig={deckConfig}
      deckLayerBlocklist={getStandardDeckViewLayerBlockList(robotType)}
      robotType={robotType}
      labwareLocations={labwareLocations}
      moduleLocations={moduleLocations}
      {...styleProps}
    />
  )
}
