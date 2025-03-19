import map from 'lodash/map'
import { BaseDeck, Flex } from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getSimplestDeckConfigForProtocol,
  getTopLabwareInfo,
  THERMOCYCLER_MODULE_V1,
} from '@opentrons/shared-data'

import { getStandardDeckViewLayerBlockList } from '/app/local-resources/deck_configuration'
import { getLabwareRenderInfo } from '/app/transformations/analysis'

import type { LabwareOnDeck } from '@opentrons/components'
import type {
  CompletedProtocolAnalysis,
  DeckDefinition,
  LabwareDefinition2,
  RunTimeCommand,
  LoadLabwareRunTimeCommand,
} from '@opentrons/shared-data'

import type { AttachedProtocolModuleMatch } from '/app/transformations/analysis'

interface LabwareMapViewProps {
  attachedProtocolModuleMatches: AttachedProtocolModuleMatch[]
  handleLabwareClick: (
    labwareDef: LabwareDefinition2,
    labwareId: string
  ) => void
  deckDef: DeckDefinition
  mostRecentAnalysis: CompletedProtocolAnalysis | null
}

export function LabwareMapView(props: LabwareMapViewProps): JSX.Element {
  const {
    handleLabwareClick,
    attachedProtocolModuleMatches,
    deckDef,
    mostRecentAnalysis,
  } = props
  const deckConfig = getSimplestDeckConfigForProtocol(mostRecentAnalysis)
  const commands: RunTimeCommand[] = mostRecentAnalysis?.commands ?? []
  const loadLabwareCommands = commands?.filter(
    (command): command is LoadLabwareRunTimeCommand =>
      command.commandType === 'loadLabware'
  )

  const labwareRenderInfo =
    mostRecentAnalysis != null
      ? getLabwareRenderInfo(mostRecentAnalysis, deckDef)
      : {}

  const modulesOnDeck = attachedProtocolModuleMatches.map(module => {
    const { moduleDef, nestedLabwareId, slotName } = module
    const { topLabwareId, topLabwareDefinition } = getTopLabwareInfo(
      module.nestedLabwareId ?? '',
      loadLabwareCommands
    )

    const isLabwareStacked =
      nestedLabwareId != null && nestedLabwareId !== topLabwareId

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
      stacked: isLabwareStacked,
    }
  })

  const labwareLocations: Array<LabwareOnDeck | null> = map(
    labwareRenderInfo,
    ({ slotName }, labwareId) => {
      const { topLabwareId, topLabwareDefinition } = getTopLabwareInfo(
        labwareId,
        loadLabwareCommands
      )
      const isLabwareInStack = labwareId !== topLabwareId

      return topLabwareDefinition != null
        ? {
            labwareLocation: { slotName },
            definition: topLabwareDefinition,
            onLabwareClick: () => {
              handleLabwareClick(topLabwareDefinition, topLabwareId)
            },
            highlight: true,
            highlightShadow: isLabwareInStack,
            stacked: isLabwareInStack,
          }
        : null
    }
  )

  const labwareLocationsFiltered: LabwareOnDeck[] = labwareLocations.filter(
    (labwareLocation): labwareLocation is LabwareOnDeck =>
      labwareLocation != null
  )

  return (
    <Flex height="27.75rem">
      <BaseDeck
        deckConfig={deckConfig}
        deckLayerBlocklist={getStandardDeckViewLayerBlockList(FLEX_ROBOT_TYPE)}
        robotType={FLEX_ROBOT_TYPE}
        labwareOnDeck={labwareLocationsFiltered}
        modulesOnDeck={modulesOnDeck}
      />
    </Flex>
  )
}
