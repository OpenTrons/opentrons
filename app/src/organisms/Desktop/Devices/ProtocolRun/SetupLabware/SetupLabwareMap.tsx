import { useState } from 'react'
import map from 'lodash/map'

import {
  BaseDeck,
  Flex,
  Box,
  DIRECTION_COLUMN,
  SPACING,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getDeckDefFromRobotType,
  getSimplestDeckConfigForProtocol,
  getTopLabwareInfo,
  THERMOCYCLER_MODULE_V1,
} from '@opentrons/shared-data'

import { getLabwareSetupItemGroups } from '/app/transformations/commands'
import { LabwareInfoOverlay } from '../LabwareInfoOverlay'
import {
  getProtocolModulesInfo,
  getLabwareRenderInfo,
} from '/app/transformations/analysis'
import { LabwareStackModal } from '/app/molecules/LabwareStackModal'
import { getStandardDeckViewLayerBlockList } from '/app/local-resources/deck_configuration'
import { OffDeckLabwareList } from './OffDeckLabwareList'

import type { LabwareOnDeck } from '@opentrons/components'
import type {
  CompletedProtocolAnalysis,
  ProtocolAnalysisOutput,
  LoadLabwareRunTimeCommand,
  RunTimeCommand,
} from '@opentrons/shared-data'

interface SetupLabwareMapProps {
  runId: string
  protocolAnalysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput | null
}

export function SetupLabwareMap({
  runId,
  protocolAnalysis,
}: SetupLabwareMapProps): JSX.Element | null {
  // early return null if no protocol analysis
  const [
    labwareStackDetailsLabwareId,
    setLabwareStackDetailsLabwareId,
  ] = useState<string | null>(null)
  const [hoverLabwareId, setHoverLabwareId] = useState<string | null>(null)

  if (protocolAnalysis == null) return null

  const commands: RunTimeCommand[] = protocolAnalysis.commands
  const loadLabwareCommands = commands?.filter(
    (command): command is LoadLabwareRunTimeCommand =>
      command.commandType === 'loadLabware'
  )

  const robotType = protocolAnalysis.robotType ?? FLEX_ROBOT_TYPE
  const deckDef = getDeckDefFromRobotType(robotType)

  const protocolModulesInfo = getProtocolModulesInfo(protocolAnalysis, deckDef)

  const modulesOnDeck = protocolModulesInfo.map(module => {
    const {
      topLabwareId,
      topLabwareDefinition,
      topLabwareDisplayName,
    } = getTopLabwareInfo(module.nestedLabwareId ?? '', loadLabwareCommands)

    const isLabwareStacked =
      module.nestedLabwareId != null && module.nestedLabwareId !== topLabwareId

    return {
      moduleModel: module.moduleDef.model,
      moduleLocation: { slotName: module.slotName },
      innerProps:
        module.moduleDef.model === THERMOCYCLER_MODULE_V1
          ? { lidMotorState: 'open' }
          : {},

      nestedLabwareDef: topLabwareDefinition,
      highlightLabware: hoverLabwareId === topLabwareId,
      highlightShadowLabware: hoverLabwareId === topLabwareId,
      stacked: isLabwareStacked,
      moduleChildren: (
        // open modal
        <g
          onClick={() => {
            if (topLabwareDefinition != null && topLabwareId != null) {
              setLabwareStackDetailsLabwareId(topLabwareId)
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
          cursor="pointer"
        >
          {topLabwareDefinition != null && topLabwareId != null ? (
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
  })

  const { offDeckItems } = getLabwareSetupItemGroups(commands)

  const deckConfig = getSimplestDeckConfigForProtocol(protocolAnalysis)

  const labwareRenderInfo = getLabwareRenderInfo(protocolAnalysis, deckDef)

  const labwareOnDeck: Array<LabwareOnDeck | null> = map(
    labwareRenderInfo,
    ({ slotName }, labwareId) => {
      const {
        topLabwareId,
        topLabwareDefinition,
        topLabwareDisplayName,
      } = getTopLabwareInfo(labwareId, loadLabwareCommands)
      const isLabwareInStack = labwareId !== topLabwareId
      return topLabwareDefinition != null
        ? {
            labwareLocation: { slotName },
            definition: topLabwareDefinition,
            highlight: isLabwareInStack && hoverLabwareId === topLabwareId,
            highlightShadow:
              isLabwareInStack && hoverLabwareId === topLabwareId,
            stacked: isLabwareInStack,
            labwareChildren: (
              <g
                cursor={isLabwareInStack ? 'pointer' : ''}
                onClick={() => {
                  if (isLabwareInStack) {
                    setLabwareStackDetailsLabwareId(topLabwareId)
                  }
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
    }
  )

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
        <OffDeckLabwareList
          labwareItems={offDeckItems}
          isFlex={robotType === FLEX_ROBOT_TYPE}
          commands={commands}
        />
      </Flex>
      {labwareStackDetailsLabwareId != null && (
        <LabwareStackModal
          labwareIdTop={labwareStackDetailsLabwareId}
          commands={commands}
          closeModal={() => {
            setLabwareStackDetailsLabwareId(null)
          }}
          robotType={robotType}
        />
      )}
    </Flex>
  )
}
