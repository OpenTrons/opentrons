import { useState } from 'react'

import {
  BaseDeck,
  getWellFillFromLabwareId,
  getLabwareInfoByLiquidId,
  Flex,
  Box,
  DIRECTION_COLUMN,
  SPACING,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getDeckDefFromRobotType,
  getSimplestDeckConfigForProtocol,
  getAllDefinitions,
  THERMOCYCLER_MODULE_V1,
} from '@opentrons/shared-data'

import { getStackedItemsOnStartingDeck } from '/app/transformations/commands'
import { LabwareInfoOverlay } from '../LabwareInfoOverlay'
import { getProtocolModulesInfo } from '/app/transformations/analysis'
import { getStandardDeckViewLayerBlockList } from '/app/local-resources/deck_configuration'
import { OffDeckLabwareList } from './OffDeckLabwareList'
import { SlotDetailModal } from './SlotDetailModal'

import type { LabwareOnDeck } from '@opentrons/components'
import type {
  CompletedProtocolAnalysis,
  ProtocolAnalysisOutput,
} from '@opentrons/shared-data'
import type { ModuleInStack, StackItem } from '/app/transformations/commands'

interface SetupLabwareMapProps {
  runId: string
  protocolAnalysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput | null
}

export function SetupLabwareMap({
  runId,
  protocolAnalysis,
}: SetupLabwareMapProps): JSX.Element | null {
  const [selectedStack, setSelectedStack] = useState<{
    slotName: string
    stack: StackItem[]
  } | null>(null)
  const [hoverLabwareId, setHoverLabwareId] = useState<string | null>(null)
  const startingDeck = getStackedItemsOnStartingDeck(
    protocolAnalysis?.commands ?? [],
    protocolAnalysis?.labware ?? [],
    protocolAnalysis?.modules ?? []
  )
  const offDeckItems = Object.keys(startingDeck).includes('offDeck')
    ? startingDeck.offDeck
    : null

  // early return null if no protocol analysis
  if (protocolAnalysis == null) return null

  const robotType = protocolAnalysis.robotType ?? FLEX_ROBOT_TYPE
  const deckDef = getDeckDefFromRobotType(robotType)
  const labwareByLiquidId = getLabwareInfoByLiquidId(protocolAnalysis.commands)
  const protocolModulesInfo = getProtocolModulesInfo(protocolAnalysis, deckDef)
  const modulesOnDeck = protocolModulesInfo.map(module => {
    const slotAndStackOnModule = Object.entries(
      startingDeck
    ).find(([key, value]) =>
      value.some(
        (stackItem): stackItem is ModuleInStack =>
          'moduleId' in stackItem && stackItem.moduleId === module.moduleId
      )
    )
    const slotName = slotAndStackOnModule?.[0]
    const stackOnModule = slotAndStackOnModule?.[1]

    const topLabwareInfo = stackOnModule != null ? stackOnModule[0] : null
    const topLabwareDefinition =
      topLabwareInfo != null && 'labwareId' in topLabwareInfo
        ? getAllDefinitions()[topLabwareInfo.definitionUri]
        : null
    const topLabwareId =
      topLabwareInfo != null && 'labwareId' in topLabwareInfo
        ? topLabwareInfo.labwareId
        : ''
    const topLabwareDisplayName =
      topLabwareInfo != null && 'labwareId' in topLabwareInfo
        ? topLabwareInfo.displayName
        : ''

    const isLabwareStacked = stackOnModule != null && stackOnModule.length > 2
    const wellFill = getWellFillFromLabwareId(
      topLabwareId,
      protocolAnalysis.liquids,
      labwareByLiquidId
    )

    return {
      moduleModel: module.moduleDef.model,
      moduleLocation: { slotName: module.slotName },
      innerProps:
        module.moduleDef.model === THERMOCYCLER_MODULE_V1
          ? { lidMotorState: 'open' }
          : {},

      nestedLabwareDef: topLabwareDefinition,
      nestedLabwareWellFill: wellFill,
      highlightLabware: hoverLabwareId === topLabwareId,
      stacked: isLabwareStacked,
      moduleChildren: (
        // open modal
        <g
          onClick={() => {
            if (stackOnModule != null) {
              setSelectedStack({
                slotName: slotName ?? module.slotName,
                stack: stackOnModule,
              })
            }
          }}
          onMouseEnter={() => {
            if (topLabwareDefinition != null && topLabwareId != null) {
              setHoverLabwareId(topLabwareId)
            }
          }}
          onMouseLeave={() => {
            setHoverLabwareId(null)
          }}
          cursor={'pointer'}
        >
          {topLabwareDefinition != null && topLabwareInfo != null ? (
            <LabwareInfoOverlay
              definition={topLabwareDefinition}
              labwareId={topLabwareId}
              displayName={topLabwareDisplayName}
              runId={runId}
            />
          ) : null}
        </g>
      ),
    }
  })

  const deckConfig = getSimplestDeckConfigForProtocol(protocolAnalysis)

  const labwareOnDeck: Array<LabwareOnDeck | null> = Object.entries(
    startingDeck
  )
    .filter(
      ([key, value]) =>
        key !== 'offDeck' &&
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
      const topLabwareDisplayName =
        topLabwareInfo != null && 'labwareId' in topLabwareInfo
          ? topLabwareInfo.displayName
          : ''
      const isLabwareInStack = stackedItems.length > 1
      const wellFill = getWellFillFromLabwareId(
        topLabwareId ?? '',
        protocolAnalysis.liquids,
        labwareByLiquidId
      )

      return topLabwareDefinition != null
        ? {
            labwareLocation: { slotName },
            definition: topLabwareDefinition,
            highlight: hoverLabwareId === topLabwareId,
            stacked: isLabwareInStack,
            wellFill: wellFill,
            labwareChildren: (
              <g
                cursor={'pointer'}
                onClick={() => {
                  setSelectedStack({ slotName: slotName, stack: stackedItems })
                }}
                onMouseEnter={() => {
                  if (topLabwareDefinition != null && topLabwareId != null) {
                    setHoverLabwareId(() => topLabwareId)
                  }
                }}
                onMouseLeave={() => {
                  setHoverLabwareId(null)
                }}
              >
                {topLabwareDefinition != null ? (
                  <LabwareInfoOverlay
                    definition={topLabwareDefinition}
                    labwareId={topLabwareId}
                    displayName={topLabwareDisplayName ?? null}
                    runId={runId}
                  />
                ) : null}
              </g>
            ),
          }
        : null
    })

  const labwareOnDeckFiltered: LabwareOnDeck[] = labwareOnDeck.filter(
    (labware): labware is LabwareOnDeck => labware != null
  )
  return (
    <Flex flex="1" flexDirection={DIRECTION_COLUMN}>
      <Flex flexDirection={DIRECTION_COLUMN} marginY={SPACING.spacing16}>
        <Box margin="0 auto" maxWidth="46.25rem" width="100%">
          <BaseDeck
            deckConfig={deckConfig}
            deckLayerBlocklist={getStandardDeckViewLayerBlockList(robotType)}
            robotType={robotType}
            labwareOnDeck={labwareOnDeckFiltered}
            modulesOnDeck={modulesOnDeck}
          />
        </Box>
        {offDeckItems != null ? (
          <OffDeckLabwareList
            labwareItems={offDeckItems}
            isFlex={robotType === FLEX_ROBOT_TYPE}
            setSelectedStack={setSelectedStack}
          />
        ) : null}
      </Flex>
      {selectedStack != null ? (
        <SlotDetailModal
          stackedItems={selectedStack.stack}
          slotName={selectedStack.slotName}
          labwareByLiquidId={labwareByLiquidId}
          mostRecentAnalysis={protocolAnalysis}
          closeModal={() => {
            setSelectedStack(null)
          }}
          isFlex={robotType === FLEX_ROBOT_TYPE}
        />
      ) : null}
    </Flex>
  )
}
