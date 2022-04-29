import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useHistory } from 'react-router-dom'

import {
  RUN_STATUS_IDLE,
  RUN_STATUS_RUNNING,
  RUN_STATUS_PAUSE_REQUESTED,
  RUN_STATUS_PAUSED,
  RUN_STATUS_STOP_REQUESTED,
  RUN_STATUS_STOPPED,
  RUN_STATUS_FAILED,
  RUN_STATUS_FINISHING,
  RUN_STATUS_SUCCEEDED,
  RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
} from '@opentrons/api-client'
import { HEATERSHAKER_MODULE_TYPE } from '@opentrons/shared-data'
import {
  Box,
  Btn,
  Flex,
  Icon,
  IconName,
  Tooltip,
  useHoverTooltip,
  useInterval,
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  DISPLAY_FLEX,
  DIRECTION_ROW,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  SIZE_1,
  SIZE_3,
  SIZE_4,
  SIZE_5,
  TEXT_TRANSFORM_UPPERCASE,
  BORDERS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  useConditionalConfirm,
} from '@opentrons/components'
import { useRunQuery } from '@opentrons/react-api-client'

import { Banner } from '../../../atoms/Banner'
import { PrimaryButton, SecondaryButton } from '../../../atoms/Buttons'
import { StyledText } from '../../../atoms/text'
import {
  useCloseCurrentRun,
  useCurrentRunId,
} from '../../../organisms/ProtocolUpload/hooks'
import { ConfirmCancelModal } from '../../../organisms/RunDetails/ConfirmCancelModal'
import { HeaterShakerIsRunningModal } from '../HeaterShakerIsRunningModal'
import {
  useRunControls,
  useRunStatus,
  useRunTimestamps,
} from '../../../organisms/RunTimeControl/hooks'
import { formatInterval } from '../../../organisms/RunTimeControl/utils'

import {
  useAttachedModules,
  useProtocolDetailsForRun,
  useRunCalibrationStatus,
  useUnmatchedModulesForProtocol,
} from '../hooks'
import { formatTimestamp } from '../utils'
import { useHeaterShakerFromProtocol } from '../ModuleCard/hooks'
import { ConfirmAttachmentModal } from '../ModuleCard/ConfirmAttachmentModal'

import type { Run } from '@opentrons/api-client'
import type { HeaterShakerModule } from '../../../redux/modules/types'
import { useTrackEvent } from '../../../redux/analytics'

interface ProtocolRunHeaderProps {
  protocolRunHeaderRef: React.RefObject<HTMLDivElement> | null
  robotName: string
  runId: string
}

function RunTimer({
  runStatus,
  startedAt,
  stoppedAt,
  completedAt,
}: {
  runStatus: string | null
  startedAt: string | null
  stoppedAt: string | null
  completedAt: string | null
}): JSX.Element {
  const [now, setNow] = React.useState(Date())
  useInterval(() => setNow(Date()), 500, true)

  const endTime =
    runStatus === RUN_STATUS_STOP_REQUESTED && stoppedAt != null
      ? stoppedAt
      : completedAt ?? now

  const runTime =
    startedAt != null ? formatInterval(startedAt, endTime) : '--:--:--'

  return (
    <StyledText css={TYPOGRAPHY.pRegular} color={COLORS.darkBlack}>
      {runTime}
    </StyledText>
  )
}

export function ProtocolRunHeader({
  protocolRunHeaderRef,
  robotName,
  runId,
}: ProtocolRunHeaderProps): JSX.Element | null {
  const { t } = useTranslation('run_details')
  const history = useHistory()
  const [targetProps, tooltipProps] = useHoverTooltip()
  const trackEvent = useTrackEvent()
  const heaterShakerFromProtocol = useHeaterShakerFromProtocol()
  const runRecord = useRunQuery(runId)
  const { displayName } = useProtocolDetailsForRun(runId)

  // this duplicates the run query above but has additional run status processing logic
  const runStatus = useRunStatus(runId)

  const { startedAt, stoppedAt, completedAt } = useRunTimestamps(runId)

  const createdAtTimestamp =
    runRecord?.data?.data.createdAt != null
      ? formatTimestamp(runRecord?.data?.data.createdAt)
      : '--:--:--'

  const startedAtTimestamp =
    startedAt != null ? formatTimestamp(startedAt) : '--:--:--'

  const completedAtTimestamp =
    completedAt != null ? formatTimestamp(completedAt) : '--:--:--'

  // redirect to new run after successful reset
  const onResetSuccess = (createRunResponse: Run): void =>
    history.push(
      `/devices/${robotName}/protocol-runs/${createRunResponse.data.id}/run-log`
    )

  const {
    play,
    pause,
    reset,
    isPlayRunActionLoading,
    isPauseRunActionLoading,
    isResetRunLoading,
  } = useRunControls(runId, onResetSuccess)

  const isMutationLoading =
    isPlayRunActionLoading || isPauseRunActionLoading || isResetRunLoading

  const { missingModuleIds } = useUnmatchedModulesForProtocol(robotName, runId)
  const { complete: isCalibrationComplete } = useRunCalibrationStatus(
    robotName,
    runId
  )
  const isSetupComplete = isCalibrationComplete && missingModuleIds.length === 0

  const currentRunId = useCurrentRunId()
  const isRobotBusy = currentRunId != null && currentRunId !== runId
  const isCurrentRun = currentRunId === runId

  const [showIsShakingModal, setShowIsShakingModal] = React.useState<boolean>(
    false
  )
  const attachedModules = useAttachedModules(robotName)
  const heaterShaker = attachedModules.find(
    (module): module is HeaterShakerModule =>
      module.moduleType === HEATERSHAKER_MODULE_TYPE
  )
  const isShaking =
    heaterShaker?.data != null && heaterShaker.data.speedStatus !== 'idle'

  const handleProceedToRunClick = (): void => {
    trackEvent({ name: 'proceedToRun', properties: {} })
    play()
  }

  const {
    confirm: confirmAttachment,
    showConfirmation: showConfirmationModal,
    cancel: cancelExit,
  } = useConditionalConfirm(handleProceedToRunClick, true)

  const handlePlayButtonClick = (): void => {
    if (isShaking) {
      setShowIsShakingModal(true)
    } else if (heaterShakerFromProtocol != null && !isShaking) {
      confirmAttachment()
    } else play()
  }

  const isRunControlButtonDisabled =
    !isSetupComplete ||
    isMutationLoading ||
    isRobotBusy ||
    runStatus === RUN_STATUS_FINISHING ||
    runStatus === RUN_STATUS_PAUSE_REQUESTED ||
    runStatus === RUN_STATUS_STOP_REQUESTED ||
    runStatus === RUN_STATUS_BLOCKED_BY_OPEN_DOOR

  let handleButtonClick = (): void => {}
  let buttonIconName: IconName | null = null
  let buttonText: string = ''

  switch (runStatus) {
    case RUN_STATUS_IDLE:
    case RUN_STATUS_PAUSED:
    case RUN_STATUS_PAUSE_REQUESTED:
    case RUN_STATUS_BLOCKED_BY_OPEN_DOOR:
      buttonIconName = 'play'
      buttonText =
        runStatus === RUN_STATUS_IDLE ? t('start_run') : t('resume_run')
      handleButtonClick = handlePlayButtonClick
      break
    case RUN_STATUS_RUNNING:
      buttonIconName = 'pause'
      buttonText = t('pause_run')
      handleButtonClick = pause
      break
    case RUN_STATUS_STOP_REQUESTED:
      buttonIconName = null
      buttonText = t('canceling_run')
      handleButtonClick = reset
      break
    case RUN_STATUS_STOPPED:
    case RUN_STATUS_FINISHING:
    case RUN_STATUS_FAILED:
    case RUN_STATUS_SUCCEEDED:
      buttonIconName = 'play'
      buttonText = t('run_again')
      handleButtonClick = reset
      break
  }

  let disableReason = null
  if (!isSetupComplete) {
    disableReason = t('setup_incomplete')
  } else if (isRobotBusy) {
    disableReason = t('robot_is_busy')
  }

  const buttonIcon =
    buttonIconName != null ? (
      <Icon
        name={buttonIconName}
        size={SIZE_1}
        marginRight={SPACING.spacing3}
      />
    ) : null

  const [
    showConfirmCancelModal,
    setShowConfirmCancelModal,
  ] = React.useState<boolean>(false)

  const handleCancelClick = (): void => {
    pause()
    setShowConfirmCancelModal(true)
  }

  const showCancelButton =
    runStatus === RUN_STATUS_RUNNING ||
    runStatus === RUN_STATUS_PAUSED ||
    runStatus === RUN_STATUS_PAUSE_REQUESTED ||
    runStatus === RUN_STATUS_BLOCKED_BY_OPEN_DOOR

  const { closeCurrentRun, isClosingCurrentRun } = useCloseCurrentRun()

  const handleClearClick = (): void => {
    closeCurrentRun()
  }

  const isClearButtonDisabled =
    isClosingCurrentRun ||
    runStatus === RUN_STATUS_RUNNING ||
    runStatus === RUN_STATUS_PAUSED ||
    runStatus === RUN_STATUS_FINISHING ||
    runStatus === RUN_STATUS_PAUSE_REQUESTED ||
    runStatus === RUN_STATUS_STOP_REQUESTED

  const clearProtocolLink = (
    <Btn
      role="link"
      onClick={handleClearClick}
      id="ProtocolRunHeader_closeRunLink"
    >
      <StyledText textDecoration={TYPOGRAPHY.textDecorationUnderline}>
        {t('clear_protocol')}
      </StyledText>
    </Btn>
  )

  const ClearProtocolBanner = (): JSX.Element | null => {
    switch (runStatus) {
      case RUN_STATUS_FAILED: {
        return (
          <Banner type="error">
            <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} width="100%">
              {`${t('run_failed')}. ${t('clear_protocol_to_make_available')} `}
              {clearProtocolLink}
            </Flex>
          </Banner>
        )
      }
      case RUN_STATUS_STOPPED: {
        return (
          <Banner type="warning">
            <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} width="100%">
              {`${t('run_canceled')}. ${t(
                'clear_protocol_to_make_available'
              )} `}
              {clearProtocolLink}
            </Flex>
          </Banner>
        )
      }
      case RUN_STATUS_SUCCEEDED: {
        return (
          <Banner type="success">
            <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} width="100%">
              {`${t('run_completed')}. ${t(
                'clear_protocol_to_make_available'
              )}`}
              {clearProtocolLink}
            </Flex>
          </Banner>
        )
      }
    }
    return null
  }

  const ProtocolRunningContent = (): JSX.Element | null =>
    runStatus != null && runStatus !== RUN_STATUS_IDLE ? (
      <Flex
        backgroundColor={COLORS.lightGrey}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        padding={SPACING.spacing3}
      >
        <Flex gridGap={SPACING.spacing6}>
          <Box>
            <StyledText
              textTransform={TEXT_TRANSFORM_UPPERCASE}
              color={COLORS.darkGreyEnabled}
              css={TYPOGRAPHY.h6Default}
              paddingBottom={SPACING.spacing2}
            >
              {t('protocol_start')}
            </StyledText>
            <StyledText
              css={TYPOGRAPHY.pRegular}
              color={COLORS.darkBlack}
              id="ProtocolRunHeader_protocolStart"
            >
              {startedAtTimestamp}
            </StyledText>
          </Box>
          <Box>
            <StyledText
              textTransform={TEXT_TRANSFORM_UPPERCASE}
              color={COLORS.darkGreyEnabled}
              css={TYPOGRAPHY.h6Default}
              paddingBottom={SPACING.spacing2}
            >
              {t('protocol_end')}
            </StyledText>
            <StyledText
              css={TYPOGRAPHY.pRegular}
              color={COLORS.darkBlack}
              id="ProtocolRunHeader_protocolEnd"
            >
              {completedAtTimestamp}
            </StyledText>
          </Box>
        </Flex>
        {showCancelButton ? (
          <SecondaryButton
            color={COLORS.errorText}
            padding={`${SPACING.spacingSM} ${SPACING.spacing4}`}
            onClick={handleCancelClick}
            id="ProtocolRunHeader_cancelRunButton"
          >
            {t('cancel_run')}
          </SecondaryButton>
        ) : null}
      </Flex>
    ) : null

  return (
    <Flex
      ref={protocolRunHeaderRef}
      backgroundColor={COLORS.white}
      border={BORDERS.lineBorder}
      borderRadius={BORDERS.radiusSoftCorners}
      color={COLORS.black}
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing4}
      marginBottom={SPACING.spacing4}
      padding={SPACING.spacing4}
    >
      {showConfirmationModal && (
        <ConfirmAttachmentModal
          onCloseClick={cancelExit}
          isProceedToRunModal={true}
          onConfirmClick={confirmAttachment}
        />
      )}

      <Flex>
        {/* TODO(bh, 2022-03-15) will update link to a protocol key stored locally when built */}
        <Link to={`/protocols/${runRecord?.data?.data.protocolId}`}>
          <StyledText
            color={COLORS.blue}
            css={TYPOGRAPHY.h2SemiBold}
            id="ProtocolRunHeader_protocolName"
          >
            {displayName}
          </StyledText>
        </Link>
      </Flex>
      {runStatus === RUN_STATUS_BLOCKED_BY_OPEN_DOOR ? (
        <Banner type="warning">{t('close_door_to_resume')}</Banner>
      ) : null}
      {isCurrentRun ? <ClearProtocolBanner /> : null}
      <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
        <Box minWidth={SIZE_4}>
          <StyledText
            textTransform={TEXT_TRANSFORM_UPPERCASE}
            color={COLORS.darkGreyEnabled}
            css={TYPOGRAPHY.h6Default}
            paddingBottom={SPACING.spacing2}
          >
            {t('run_id')}
          </StyledText>
          {/* this is the createdAt timestamp, not the run id */}
          <StyledText
            css={TYPOGRAPHY.pRegular}
            color={COLORS.darkBlack}
            id="ProtocolRunHeader_runRecordId"
          >
            {createdAtTimestamp}
          </StyledText>
        </Box>
        <Box minWidth={SIZE_3}>
          <StyledText
            textTransform={TEXT_TRANSFORM_UPPERCASE}
            color={COLORS.darkGreyEnabled}
            css={TYPOGRAPHY.h6Default}
            paddingBottom={SPACING.spacing2}
          >
            {t('status')}
          </StyledText>
          <Flex alignItems={ALIGN_CENTER}>
            {runStatus === RUN_STATUS_RUNNING ? (
              <Icon
                name="circle"
                color={COLORS.blue}
                size={SPACING.spacing2}
                marginRight={SPACING.spacing2}
                data-testid="running_circle"
              >
                <animate
                  attributeName="fill"
                  values={`${COLORS.blue}; transparent`}
                  dur="1s"
                  calcMode="discrete"
                  repeatCount="indefinite"
                  data-testid="pulsing_status_circle"
                />
              </Icon>
            ) : null}
            <StyledText
              css={TYPOGRAPHY.pRegular}
              color={COLORS.darkBlack}
              id="ProtocolRunHeader_runStatus"
            >
              {runStatus != null ? t(`status_${runStatus}`) : ''}
            </StyledText>
          </Flex>
        </Box>
        <Box minWidth={SIZE_3}>
          <StyledText
            textTransform={TEXT_TRANSFORM_UPPERCASE}
            color={COLORS.darkGreyEnabled}
            css={TYPOGRAPHY.h6Default}
            paddingBottom={SPACING.spacing2}
          >
            {t('run_time')}
          </StyledText>
          <RunTimer
            runStatus={runStatus}
            startedAt={startedAt}
            stoppedAt={stoppedAt}
            completedAt={completedAt}
          />
        </Box>
        {showIsShakingModal && heaterShaker != null && (
          <HeaterShakerIsRunningModal
            closeModal={() => setShowIsShakingModal(false)}
            module={heaterShaker}
            startRun={play}
          />
        )}
        <Flex
          justifyContent={'flex-end'}
          flexDirection={DIRECTION_ROW}
          gridGap={SPACING.spacingSM}
          width={SIZE_5}
        >
          {isCurrentRun ? (
            <SecondaryButton
              padding={`${SPACING.spacingSM} ${SPACING.spacing4}`}
              onClick={handleClearClick}
              disabled={isClearButtonDisabled}
              id="ProtocolRunHeader_closeRunButton"
            >
              {t('clear_protocol')}
            </SecondaryButton>
          ) : null}
          <PrimaryButton
            justifyContent={JUSTIFY_CENTER}
            alignItems={ALIGN_CENTER}
            boxShadow="none"
            display={DISPLAY_FLEX}
            padding={`${SPACING.spacingSM} ${SPACING.spacing4}`}
            disabled={isRunControlButtonDisabled}
            onClick={handleButtonClick}
            id="ProtocolRunHeader_runControlButton"
            {...targetProps}
          >
            {buttonIcon}
            <StyledText css={TYPOGRAPHY.pSemiBold}>{buttonText}</StyledText>
          </PrimaryButton>
          {disableReason != null && (
            <Tooltip {...tooltipProps}>{disableReason}</Tooltip>
          )}
        </Flex>
      </Flex>
      <ProtocolRunningContent />
      {showConfirmCancelModal ? (
        <ConfirmCancelModal
          onClose={() => setShowConfirmCancelModal(false)}
          runId={runId}
        />
      ) : null}
    </Flex>
  )
}
