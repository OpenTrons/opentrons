import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import { ViewportList } from 'react-viewport-list'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  OVERFLOW_HIDDEN,
  OVERFLOW_WRAP_ANYWHERE,
  POSITION_RELATIVE,
  SPACING,
  getCommandTextData,
  CommandText,
  LegacyStyledText,
  TYPOGRAPHY,
  StyledText,
} from '@opentrons/components'
import { RUN_STATUS_RUNNING, RUN_STATUS_IDLE } from '@opentrons/api-client'

import { CommandIcon } from '/app/molecules/Command'
import { PlayPauseButton } from './PlayPauseButton'
import { StopButton } from './StopButton'
import { ANALYTICS_PROTOCOL_RUN_ACTION } from '/app/redux/analytics'

import type { ViewportListRef } from 'react-viewport-list'
import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
  RobotType,
} from '@opentrons/shared-data'
import type { RunStatus } from '@opentrons/api-client'
import type { TrackProtocolRunEvent } from '/app/redux-resources/analytics'
import type { RobotAnalyticsData } from '/app/redux/analytics/types'

const TITLE_TEXT_STYLE = css`
  color: ${COLORS.grey60};
  font-size: ${TYPOGRAPHY.fontSize28};
  font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
  line-height: ${TYPOGRAPHY.lineHeight36};
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: ${OVERFLOW_WRAP_ANYWHERE};
  height: max-content;
`

const COMMAND_ROW_STYLE = css`
  font-size: ${TYPOGRAPHY.fontSize22};
  line-height: ${TYPOGRAPHY.lineHeight28};
  font-weight: ${TYPOGRAPHY.fontWeightRegular};
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
`

interface VisibleIndexRange {
  lowestVisibleIndex: number
  highestVisibleIndex: number
}

interface RunningProtocolCommandListProps {
  runStatus: RunStatus | null
  robotSideAnalysis: CompletedProtocolAnalysis | null
  robotType: RobotType
  playRun: () => void
  pauseRun: () => void
  setShowConfirmCancelRunModal: (showConfirmCancelRunModal: boolean) => void
  trackProtocolRunEvent: TrackProtocolRunEvent
  robotAnalyticsData: RobotAnalyticsData | null
  protocolName?: string
  currentRunCommandIndex?: number
  allRunDefs: LabwareDefinition2[]
}

export function RunningProtocolCommandList({
  runStatus,
  robotSideAnalysis,
  robotType,
  playRun,
  pauseRun,
  setShowConfirmCancelRunModal,
  trackProtocolRunEvent,
  robotAnalyticsData,
  protocolName,
  currentRunCommandIndex,
  allRunDefs,
}: RunningProtocolCommandListProps): JSX.Element {
  const { t } = useTranslation('run_details')
  const viewPortRef = useRef<HTMLDivElement | null>(null)
  const ref = useRef<ViewportListRef>(null)
  const currentRunStatus = t(`status_${runStatus}`)
  const onStop = (): void => {
    if (runStatus === RUN_STATUS_RUNNING) pauseRun()
    setShowConfirmCancelRunModal(true)
  }
  const [visibleRange, setVisibleRange] = useState<VisibleIndexRange>({
    lowestVisibleIndex: 0,
    highestVisibleIndex: 0,
  })

  const onTogglePlayPause = (): void => {
    if (runStatus === RUN_STATUS_RUNNING) {
      pauseRun()
      trackProtocolRunEvent({ name: ANALYTICS_PROTOCOL_RUN_ACTION.PAUSE })
    } else {
      playRun()
      trackProtocolRunEvent({
        name:
          runStatus === RUN_STATUS_IDLE
            ? ANALYTICS_PROTOCOL_RUN_ACTION.START
            : ANALYTICS_PROTOCOL_RUN_ACTION.RESUME,
        properties:
          runStatus === RUN_STATUS_IDLE && robotAnalyticsData != null
            ? robotAnalyticsData
            : {},
      })
    }
  }

  useEffect(() => {
    // Note (kk:09/25/2023) Need -1 because the element of highestVisibleIndex cannot really readable
    // due to limited space
    const isCurrentCommandVisible =
      currentRunCommandIndex != null &&
      currentRunCommandIndex >= visibleRange.lowestVisibleIndex &&
      currentRunCommandIndex <= visibleRange.highestVisibleIndex - 1

    if (
      ref.current != null &&
      !isCurrentCommandVisible &&
      currentRunCommandIndex != null
    ) {
      ref.current.scrollToIndex(currentRunCommandIndex)
    }
  }, [
    currentRunCommandIndex,
    visibleRange.highestVisibleIndex,
    visibleRange.lowestVisibleIndex,
  ])

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing40}
      height="29.5rem"
    >
      <Flex
        flexDirection={DIRECTION_ROW}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_FLEX_START}
        gridGap={SPACING.spacing40}
        height="6.75rem"
      >
        <Flex flexDirection={DIRECTION_COLUMN}>
          <LegacyStyledText as="h4" fontWeight={TYPOGRAPHY.fontWeightBold}>
            {currentRunStatus}
          </LegacyStyledText>
          <LegacyStyledText css={TITLE_TEXT_STYLE}>
            {protocolName}
          </LegacyStyledText>
        </Flex>
        <Flex height="100%" gridGap="1.5rem" alignItems={ALIGN_CENTER}>
          <StopButton onStop={onStop} buttonSize="6.26rem" iconSize="2.5rem" />
          <PlayPauseButton
            onTogglePlayPause={onTogglePlayPause}
            buttonSize="6.25rem"
            runStatus={runStatus}
            iconSize="2.5rem"
          />
        </Flex>
      </Flex>
      {robotSideAnalysis != null ? (
        <Flex
          ref={viewPortRef}
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing8}
          height="20.25rem"
          position={POSITION_RELATIVE}
          overflow={OVERFLOW_HIDDEN}
        >
          <ViewportList
            viewportRef={viewPortRef}
            ref={ref}
            items={robotSideAnalysis?.commands}
            onViewportIndexesChange={([
              lowestVisibleIndex,
              highestVisibleIndex,
            ]) => {
              if (
                currentRunCommandIndex != null &&
                currentRunCommandIndex >= 0
              ) {
                setVisibleRange({
                  lowestVisibleIndex,
                  highestVisibleIndex,
                })
              }
            }}
            initialIndex={currentRunCommandIndex}
            margin={0}
          >
            {(command, index) => {
              const backgroundColor =
                index === currentRunCommandIndex ? COLORS.blue35 : COLORS.grey35
              return (
                <Flex
                  key={command.id}
                  alignItems={ALIGN_CENTER}
                  gridGap={SPACING.spacing12}
                >
                  <StyledText
                    minWidth={SPACING.spacing16}
                    oddStyle="bodyTextRegular"
                    height="1.75rem"
                  >
                    {index + 1}
                  </StyledText>
                  <Flex
                    padding={`${SPACING.spacing12} ${SPACING.spacing24}`}
                    alignItems={ALIGN_CENTER}
                    backgroundColor={backgroundColor}
                    width="100%"
                    fontSize="1.375rem"
                    lineHeight="1.75rem"
                    fontWeight={TYPOGRAPHY.fontWeightRegular}
                    borderRadius={BORDERS.borderRadius8}
                    gridGap="0.875rem"
                  >
                    <CommandIcon command={command} size="2rem" />
                    <CommandText
                      command={command}
                      commandTextData={getCommandTextData(robotSideAnalysis)}
                      robotType={robotType}
                      css={COMMAND_ROW_STYLE}
                      isOnDevice={true}
                      allRunDefs={allRunDefs}
                    />
                  </Flex>
                </Flex>
              )
            }}
          </ViewportList>
          {/* <Flex css={BOTTOM_ROW_STYLE}></Flex> */}
        </Flex>
      ) : null}
    </Flex>
  )
}
