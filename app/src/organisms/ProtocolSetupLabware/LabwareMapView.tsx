import * as React from 'react'
import map from 'lodash/map'
import { BaseDeck, Flex } from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getSimplestDeckConfigForProtocol,
  THERMOCYCLER_MODULE_V1,
} from '@opentrons/shared-data'

import { getStandardDeckViewLayerBlockList } from '../Devices/ProtocolRun/utils/getStandardDeckViewLayerBlockList'
import { getLabwareRenderInfo } from '../Devices/ProtocolRun/utils/getLabwareRenderInfo'

import type {
  CompletedProtocolAnalysis,
  DeckDefinition,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { LoadedLabwareByAdapter } from '@opentrons/api-client'
import type { AttachedProtocolModuleMatch } from '../ProtocolSetupModulesAndDeck/utils'

interface LabwareMapViewProps {
  attachedProtocolModuleMatches: AttachedProtocolModuleMatch[]
  handleLabwareClick: (
    labwareDef: LabwareDefinition2,
    labwareId: string
  ) => void
  initialLoadedLabwareByAdapter: LoadedLabwareByAdapter
  deckDef: DeckDefinition
  mostRecentAnalysis: CompletedProtocolAnalysis | null
}

export function LabwareMapView(props: LabwareMapViewProps): JSX.Element {
  const {
    handleLabwareClick,
    attachedProtocolModuleMatches,
    initialLoadedLabwareByAdapter,
    deckDef,
    mostRecentAnalysis,
  } = props
  const deckConfig = getSimplestDeckConfigForProtocol(mostRecentAnalysis)
  const labwareRenderInfo =
    mostRecentAnalysis != null
      ? getLabwareRenderInfo(mostRecentAnalysis, deckDef)
      : {}

  const modulesOnDeck = attachedProtocolModuleMatches.map(module => {
    const { moduleDef, nestedLabwareDef, nestedLabwareId, slotName } = module
    const labwareInAdapterInMod =
      nestedLabwareId != null
        ? initialLoadedLabwareByAdapter[nestedLabwareId]
        : null
    //  only rendering the labware on top most layer so
    //  either the adapter or the labware are rendered but not both
    const topLabwareDefinition =
      labwareInAdapterInMod?.result?.definition ?? nestedLabwareDef
    const topLabwareId =
      labwareInAdapterInMod?.result?.labwareId ?? nestedLabwareId

    return {
      moduleModel: moduleDef.model,
      moduleLocation: { slotName },
      innerProps:
        moduleDef.model === THERMOCYCLER_MODULE_V1
          ? { lidMotorState: 'open' }
          : {},
      nestedLabwareDef: topLabwareDefinition,
      onLabwareClick:
        topLabwareDefinition != null && topLabwareId != null
          ? () => {
              handleLabwareClick(topLabwareDefinition, topLabwareId)
            }
          : undefined,
      highlightLabware: true,
      moduleChildren: null,
    }
  })

  const labwareLocations = map(
    labwareRenderInfo,
    ({ labwareDef, slotName }, labwareId) => {
      const labwareInAdapter = initialLoadedLabwareByAdapter[labwareId]
      //  only rendering the labware on top most layer so
      //  either the adapter or the labware are rendered but not both
      const topLabwareDefinition =
        labwareInAdapter?.result?.definition ?? labwareDef
      const topLabwareId = labwareInAdapter?.result?.labwareId ?? labwareId

      return {
        labwareLocation: { slotName },
        definition: topLabwareDefinition,
        topLabwareId,
        onLabwareClick: () => {
          handleLabwareClick(topLabwareDefinition, topLabwareId)
        },
        labwareChildren: null,
        highlight: true,
      }
    }
  )

  return (
    <Flex height="27.75rem">
      <BaseDeck
        deckConfig={deckConfig}
        deckLayerBlocklist={getStandardDeckViewLayerBlockList(FLEX_ROBOT_TYPE)}
        robotType={FLEX_ROBOT_TYPE}
        labwareOnDeck={labwareLocations}
        modulesOnDeck={modulesOnDeck}
      />
    </Flex>
  )
}
