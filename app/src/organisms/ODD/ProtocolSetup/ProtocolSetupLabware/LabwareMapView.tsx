import { BaseDeck, Flex, getWellFillFromLabwareId } from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getSimplestDeckConfigForProtocol,
  getAllDefinitions,
  THERMOCYCLER_MODULE_V1,
} from '@opentrons/shared-data'

import { getStandardDeckViewLayerBlockList } from '/app/local-resources/deck_configuration'

import type { LabwareOnDeck } from '@opentrons/components'
import type { LabwareByLiquidId } from '@opentrons/components/src/hardware-sim/ProtocolDeck/types'
import type {
  CompletedProtocolAnalysis,
  DeckDefinition,
  LabwareDefinition2,
  RunTimeCommand,
} from '@opentrons/shared-data'
import type { AttachedProtocolModuleMatch } from '/app/transformations/analysis'
import type {
  StackedItemsOnDeck,
  ModuleInStack,
} from '/app/transformations/commands'

interface LabwareMapViewProps {
  attachedProtocolModuleMatches: AttachedProtocolModuleMatch[]
  handleLabwareClick: (
    labwareDef: LabwareDefinition2,
    labwareId: string
  ) => void
  mostRecentAnalysis: CompletedProtocolAnalysis | null
  startingDeck: StackedItemsOnDeck
  labwareByLiquidId: LabwareByLiquidId
}

export function LabwareMapView(props: LabwareMapViewProps): JSX.Element {
  const {
    handleLabwareClick,
    attachedProtocolModuleMatches,
    mostRecentAnalysis,
    startingDeck,
    labwareByLiquidId,
  } = props
  const deckConfig = getSimplestDeckConfigForProtocol(mostRecentAnalysis)

  const modulesOnDeck = attachedProtocolModuleMatches.map(module => {
    const { moduleDef, slotName } = module
    const stackOnModule = Object.entries(startingDeck).find(([key, value]) =>
      value.some(
        (stackItem): stackItem is ModuleInStack =>
          'moduleId' in stackItem && stackItem.moduleId === module.moduleId
      )
    )?.[1]
    const topLabwareInfo = stackOnModule != null ? stackOnModule[0] : null
    const topLabwareDefinition =
      topLabwareInfo != null && 'labwareId' in topLabwareInfo
        ? getAllDefinitions()[topLabwareInfo.definitionUri]
        : null
    const topLabwareId =
      topLabwareInfo != null && 'labwareId' in topLabwareInfo
        ? topLabwareInfo.labwareId
        : ''
    const isLabwareStacked = stackOnModule != null && stackOnModule.length > 2
    const wellFill = getWellFillFromLabwareId(
      topLabwareId ?? '',
      mostRecentAnalysis?.liquids ?? [],
      labwareByLiquidId
    )
    return {
      moduleModel: moduleDef.model,
      moduleLocation: { slotName },
      innerProps:
        moduleDef.model === THERMOCYCLER_MODULE_V1
          ? { lidMotorState: 'open' }
          : {},
      nestedLabwareDef: topLabwareDefinition,
      nestedLabwareWellFill: wellFill,
      onLabwareClick: () => {
        null
      },
      highlightLabware: true,
      moduleChildren: null,
      stacked: isLabwareStacked,
    }
  })

  const labwareLocations: Array<LabwareOnDeck | null> = Object.entries(
    startingDeck
  )
    .filter(
      ([key, value]) =>
        key != 'offDeck' &&
        !value.some(
          (stackItem): stackItem is ModuleInStack => 'moduleId' in stackItem
        )
    )
    .map(([slotName, stackedItems]) => {
      const topLabwareInfo = stackedItems[0]
      const topLabwareDefinition =
        topLabwareInfo != null && 'labwareId' in topLabwareInfo
          ? getAllDefinitions()[topLabwareInfo.definitionUri]
          : null
      const topLabwareId =
        topLabwareInfo != null && 'labwareId' in topLabwareInfo
          ? topLabwareInfo.labwareId
          : ''
      const isLabwareInStack = stackedItems.length > 1
      const wellFill = getWellFillFromLabwareId(
        topLabwareId ?? '',
        mostRecentAnalysis?.liquids ?? [],
        labwareByLiquidId
      )

      return topLabwareDefinition != null
        ? {
            labwareLocation: { slotName },
            definition: topLabwareDefinition,
            onLabwareClick: () => {
              handleLabwareClick(topLabwareDefinition, topLabwareId)
            },
            wellFill: wellFill,
            highlight: true,
            stacked: isLabwareInStack,
          }
        : null
    })

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
