import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  getLabwareInfoByLiquidId,
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  BORDERS,
  Box,
  Chip,
  Tag,
  ListItem,
  COLORS,
  DeckInfoLabel,
  StyledText,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  MODULE_ICON_NAME_BY_TYPE,
  SPACING,
  TYPOGRAPHY,
  JUSTIFY_CENTER,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getDeckDefFromRobotType,
  HEATERSHAKER_MODULE_TYPE,
} from '@opentrons/shared-data'
import {
  useCreateLiveCommandMutation,
  useModulesQuery,
} from '@opentrons/react-api-client'

import { FloatingActionButton, SmallButton } from '/app/atoms/buttons'
import { ODDBackButton } from '/app/molecules/ODDBackButton'
import {
  getStackedItemsOnStartingDeck,
  getLabwareLiquidRenderInfoFromStack,
} from '/app/transformations/commands'
import {
  getAttachedProtocolModuleMatches,
  getProtocolModulesInfo,
} from '/app/transformations/analysis'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'
import { useMostRecentCompletedAnalysis } from '/app/resources/runs'
import { LabwareMapView } from './LabwareMapView'
import { SetupLabwareStackView } from './SetupLabwareStackView'

import type { Dispatch, SetStateAction } from 'react'
import type { UseQueryResult } from 'react-query'
import type {
  HeaterShakerCloseLatchCreateCommand,
  HeaterShakerOpenLatchCreateCommand,
} from '@opentrons/shared-data'
import type { LabwareByLiquidId } from '@opentrons/components/src/hardware-sim/ProtocolDeck/types'
import type { HeaterShakerModule, Modules } from '@opentrons/api-client'
import type {
  StackItem,
  ModuleInStack,
  LabwareInStack,
} from '/app/transformations/commands'
import type { SetupScreens } from '../types'
import type { AttachedProtocolModuleMatch } from '/app/transformations/analysis'

const MODULE_REFETCH_INTERVAL_MS = 5000
const DECK_CONFIG_POLL_MS = 5000

export interface ProtocolSetupLabwareProps {
  runId: string
  setSetupScreen: Dispatch<SetStateAction<SetupScreens>>
  isConfirmed: boolean
  setIsConfirmed: (confirmed: boolean) => void
}

export function ProtocolSetupLabware({
  runId,
  setSetupScreen,
  isConfirmed,
  setIsConfirmed,
}: ProtocolSetupLabwareProps): JSX.Element {
  const { t } = useTranslation('protocol_setup')
  const [showMapView, setShowMapView] = useState<boolean>(true)
  const [selectedLabwareStack, setSelectedLabwareStack] = useState<
    [string, StackItem[]] | null
  >(null)

  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)
  const deckDef = getDeckDefFromRobotType(FLEX_ROBOT_TYPE)
  const { data: deckConfig = [] } = useNotifyDeckConfigurationQuery({
    refetchInterval: DECK_CONFIG_POLL_MS,
  })
  const startingDeck = getStackedItemsOnStartingDeck(
    mostRecentAnalysis?.commands ?? [],
    mostRecentAnalysis?.labware ?? [],
    mostRecentAnalysis?.modules ?? []
  )
  const labwareByLiquidId = getLabwareInfoByLiquidId(
    mostRecentAnalysis?.commands ?? []
  )
  const sortedStartingDeckEntries = Object.entries(startingDeck)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .filter(([key]) => key !== 'offDeck')
  const offDeckItems = Object.keys(startingDeck).includes('offDeck')
    ? startingDeck['offDeck']
    : null

  const moduleQuery = useModulesQuery({
    refetchInterval: MODULE_REFETCH_INTERVAL_MS,
  })
  const attachedModules = moduleQuery?.data?.data ?? []
  const protocolModulesInfo =
    mostRecentAnalysis != null
      ? getProtocolModulesInfo(mostRecentAnalysis, deckDef)
      : []

  const attachedProtocolModuleMatches = getAttachedProtocolModuleMatches(
    attachedModules,
    protocolModulesInfo,
    deckConfig
  )

  return (
    <>
      {selectedLabwareStack != null && mostRecentAnalysis != null ? (
        <SetupLabwareStackView
          onClickBack={() => setSelectedLabwareStack(null)}
          slotName={selectedLabwareStack[0]}
          labwareByLiquidId={labwareByLiquidId}
          stackedItems={selectedLabwareStack[1]}
          mostRecentAnalysis={mostRecentAnalysis}
        />
      ) : (
        <>
          <Flex
            flexDirection={DIRECTION_ROW}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
          >
            <ODDBackButton
              label={t('labware_liquids_setup_step_title')}
              onClick={() => {
                setSetupScreen('prepare to run')
              }}
            />
            {isConfirmed ? (
              <Chip
                background
                iconName="ot-check"
                text={t('placements_confirmed')}
                type="success"
              />
            ) : (
              <SmallButton
                buttonText={t('confirm_placements')}
                onClick={() => {
                  setIsConfirmed(true)
                  setSetupScreen('prepare to run')
                }}
                buttonCategory="rounded"
              />
            )}
          </Flex>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing8}
            marginTop={SPACING.spacing32}
          >
            {showMapView ? (
              <LabwareMapView
                mostRecentAnalysis={mostRecentAnalysis}
                attachedProtocolModuleMatches={attachedProtocolModuleMatches}
                startingDeck={startingDeck}
                labwareByLiquidId={labwareByLiquidId}
                handleLabwareClick={setSelectedLabwareStack}
              />
            ) : (
              <>
                <Flex gridGap={SPACING.spacing8} color={COLORS.grey60}>
                  <Flex paddingLeft={SPACING.spacing16} width="10.5625rem">
                    <StyledText oddStyle="bodyTextSemiBold">
                      {t('location')}
                    </StyledText>
                  </Flex>
                  <Flex>
                    <StyledText oddStyle="bodyTextSemiBold">
                      {t('labware_name')}
                    </StyledText>
                  </Flex>
                </Flex>
                {sortedStartingDeckEntries.map(([key, value], index) => (
                  <RowLabware
                    key={index}
                    attachedProtocolModules={attachedProtocolModuleMatches}
                    refetchModules={moduleQuery.refetch}
                    slotName={key}
                    stackedItems={value}
                    labwareByLiquidId={labwareByLiquidId}
                    onClick={setSelectedLabwareStack}
                  />
                ))}
                {offDeckItems?.forEach((item, index) => (
                  <RowLabware
                    key={index}
                    attachedProtocolModules={attachedProtocolModuleMatches}
                    refetchModules={moduleQuery.refetch}
                    slotName={'offDeck'}
                    stackedItems={[item]}
                    labwareByLiquidId={labwareByLiquidId}
                    onClick={setSelectedLabwareStack}
                  />
                ))}
              </>
            )}
          </Flex>
          <FloatingActionButton
            buttonText={showMapView ? t('list_view') : t('map_view')}
            onClick={() => {
              setShowMapView(mapView => !mapView)
            }}
          />
        </>
      )}
    </>
  )
}

const labwareLatchStyles = css`
  &:active {
    background-color: ${COLORS.blue35};
  }
`

interface LabwareLatchProps {
  matchedHeaterShaker: HeaterShakerModule
  refetchModules: UseQueryResult<Modules>['refetch']
}

function LabwareLatch({
  matchedHeaterShaker,
  refetchModules,
}: LabwareLatchProps): JSX.Element {
  const { t } = useTranslation(['heater_shaker', 'protocol_setup'])
  const {
    createLiveCommand,
    isLoading: isLiveCommandLoading,
  } = useCreateLiveCommandMutation()
  const [isRefetchingModules, setIsRefetchingModules] = useState(false)
  const isLatchLoading =
    isLiveCommandLoading ||
    isRefetchingModules ||
    matchedHeaterShaker.data.labwareLatchStatus === 'opening' ||
    matchedHeaterShaker.data.labwareLatchStatus === 'closing'
  const isLatchClosed =
    matchedHeaterShaker.data.labwareLatchStatus === 'idle_closed' ||
    matchedHeaterShaker.data.labwareLatchStatus === 'opening'

  let icon: 'latch-open' | 'latch-closed' | null = null

  const latchCommand:
    | HeaterShakerOpenLatchCreateCommand
    | HeaterShakerCloseLatchCreateCommand = {
    commandType: isLatchClosed
      ? 'heaterShaker/openLabwareLatch'
      : 'heaterShaker/closeLabwareLatch',
    params: { moduleId: matchedHeaterShaker.id },
  }

  const toggleLatch = (): void => {
    createLiveCommand({
      command: latchCommand,
      waitUntilComplete: true,
    })
      .then(() => {
        setIsRefetchingModules(true)
        refetchModules()
          .then(() => {
            setIsRefetchingModules(false)
          })
          .catch((e: Error) => {
            console.error(
              `error refetching modules after toggle latch: ${e.message}`
            )
            setIsRefetchingModules(false)
          })
      })
      .catch((e: Error) => {
        console.error(
          `error setting module status with command type ${latchCommand.commandType}: ${e.message}`
        )
      })
  }
  const commandType = isLatchClosed
    ? 'heaterShaker/openLabwareLatch'
    : 'heaterShaker/closeLabwareLatch'
  let hsLatchText: string | null = t('open')
  if (commandType === 'heaterShaker/closeLabwareLatch' && isLatchLoading) {
    hsLatchText = t('closing')
    icon = 'latch-open'
  } else if (
    commandType === 'heaterShaker/openLabwareLatch' &&
    isLatchLoading
  ) {
    hsLatchText = t('opening')
    icon = 'latch-closed'
  } else if (
    commandType === 'heaterShaker/closeLabwareLatch' &&
    !isLatchLoading
  ) {
    hsLatchText = t('open')
    icon = 'latch-open'
  } else if (
    commandType === 'heaterShaker/openLabwareLatch' &&
    !isLatchLoading
  ) {
    hsLatchText = t('closed')
    icon = 'latch-closed'
  }

  return (
    <Flex
      alignItems={ALIGN_FLEX_START}
      backgroundColor={COLORS.blue35}
      borderRadius={BORDERS.borderRadius16}
      css={labwareLatchStyles}
      color={isLatchLoading ? COLORS.grey60 : COLORS.black90}
      height="6.5rem"
      alignSelf={ALIGN_CENTER}
      flexDirection={DIRECTION_COLUMN}
      fontSize={TYPOGRAPHY.fontSize22}
      gridGap={SPACING.spacing8}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      lineHeight={TYPOGRAPHY.lineHeight28}
      minWidth="11.0625rem"
      onClick={toggleLatch}
      padding={SPACING.spacing12}
    >
      <StyledText oddStyle="bodyTextSemiBold">
        {t('protocol_setup:labware_latch')}
      </StyledText>
      <Flex
        width="100%"
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_CENTER}
      >
        {hsLatchText != null && icon != null ? (
          <>
            <StyledText oddStyle="bodyTextRegular">{hsLatchText}</StyledText>
            <Icon
              name={icon}
              size="2.5rem"
              color={
                commandType === 'heaterShaker/closeLabwareLatch'
                  ? COLORS.blue50
                  : COLORS.black90
              }
            />
          </>
        ) : null}
      </Flex>
    </Flex>
  )
}

interface RowLabwareProps {
  attachedProtocolModules: AttachedProtocolModuleMatch[]
  refetchModules: UseQueryResult<Modules>['refetch']
  slotName: string
  stackedItems: StackItem[]
  onClick: Dispatch<SetStateAction<[string, StackItem[]] | null>>
  labwareByLiquidId: LabwareByLiquidId
}

function RowLabware({
  attachedProtocolModules,
  refetchModules,
  slotName,
  stackedItems,
  onClick,
  labwareByLiquidId,
}: RowLabwareProps): JSX.Element | null {
  const moduleInStack = stackedItems.find(
    (item): item is ModuleInStack => 'moduleModel' in item
  )
  const labwareInStack = stackedItems.filter(
    (lw): lw is LabwareInStack => 'labwareId' in lw
  )

  const labwareLiquidRenderInfo = getLabwareLiquidRenderInfoFromStack(
    labwareInStack,
    labwareByLiquidId
  )
  const isStacked =
    labwareLiquidRenderInfo.length > 1 ||
    labwareLiquidRenderInfo.some(labware => labware.quantity > 1)

  const { t, i18n } = useTranslation([
    'protocol_command_text',
    'protocol_setup',
  ])

  const matchedModule =
    moduleInStack != null && attachedProtocolModules.length > 0
      ? attachedProtocolModules.find(
          mod => mod.moduleId === moduleInStack.moduleId
        )
      : null
  const matchingHeaterShaker =
    matchedModule?.attachedModuleMatch != null &&
    matchedModule.attachedModuleMatch.moduleType === HEATERSHAKER_MODULE_TYPE
      ? matchedModule.attachedModuleMatch
      : null

  const location: JSX.Element = (
    <DeckInfoLabel
      deckLabel={
        slotName === 'offDeck'
          ? i18n.format(t('off_deck'), 'upperCase')
          : slotName
      }
    />
  )
  return (
    <ListItem
      type="default"
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_CENTER}
      backgroundColor={COLORS.grey35}
      gridGap={SPACING.spacing32}
      onClick={() => onClick([slotName, labwareInStack])}
    >
      <Flex gridGap={SPACING.spacing4} width="7.6875rem">
        {location}
        {matchedModule != null ? (
          <DeckInfoLabel
            iconName={
              MODULE_ICON_NAME_BY_TYPE[matchedModule.moduleDef.moduleType]
            }
          />
        ) : null}
        {isStacked ? <DeckInfoLabel iconName="stacked" /> : null}
      </Flex>
      <Flex
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        flexDirection={DIRECTION_ROW}
        width="75%"
      >
        <Flex flexDirection={DIRECTION_COLUMN} justifyContent={JUSTIFY_CENTER}>
          {labwareLiquidRenderInfo.map((labware, index) => (
            <>
              <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
                <StyledText
                  oddStyle="bodyTextSemiBold"
                  fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                >
                  {labware.displayName}
                </StyledText>
                {labware.lidDisplayName != null ? (
                  <StyledText oddStyle="bodyTextRegular" color={COLORS.grey60}>
                    {labware.lidDisplayName}
                  </StyledText>
                ) : null}
                {labware.quantity > 1 || labware.liquids > 0 ? (
                  <Flex
                    flexDirection={DIRECTION_ROW}
                    paddingTop={SPACING.spacing4}
                    gridGap={SPACING.spacing8}
                  >
                    {labware.quantity > 1 ? (
                      <Tag
                        type="default"
                        text={t('protocol_setup:labware_quantity', {
                          quantity: labware.quantity,
                        })}
                      />
                    ) : null}
                    {labware.liquids > 0 ? (
                      <Tag
                        type="default"
                        text={
                          labware.quantity > 1
                            ? t('protocol_setup:multiple_liquid_layouts')
                            : t('protocol_setup:number_of_liquids', {
                                number: labware.liquids,
                                count: labware.liquids,
                              })
                        }
                      />
                    ) : null}
                  </Flex>
                ) : null}
                {index !== labwareLiquidRenderInfo.length - 1 ? (
                  <Box
                    borderBottom={`1px solid ${COLORS.grey60}`}
                    marginY={SPACING.spacing16}
                    width={matchingHeaterShaker != null ? '26rem' : '40rem'}
                  />
                ) : null}
              </Flex>
            </>
          ))}
        </Flex>
        {matchingHeaterShaker != null ? (
          <LabwareLatch
            matchedHeaterShaker={matchingHeaterShaker}
            refetchModules={refetchModules}
          />
        ) : null}
      </Flex>
      <Icon name="more" size={SPACING.spacing40} />
    </ListItem>
  )
}
