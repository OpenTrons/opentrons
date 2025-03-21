import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Flex,
  SPACING,
  COLORS,
  Icon,
  StyledText,
  AlertPrimaryButton,
} from '@opentrons/components'
import {
  RUN_STATUS_AWAITING_RECOVERY,
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_AWAITING_RECOVERY_PAUSED,
} from '@opentrons/api-client'

import { useUpdateClientDataRecovery } from '/app/resources/client_data'
import { TakeoverModal } from '/app/organisms/TakeoverModal/TakeoverModal'
import { RecoveryInterventionModal } from './shared'

import type {
  ClientDataRecovery,
  UseUpdateClientDataRecoveryResult,
} from '/app/resources/client_data'
import type { ErrorRecoveryFlowsProps } from '.'
import {
  BANNER_TEXT_CONTAINER_STYLE,
  BANNER_TEXT_CONTENT_STYLE,
} from './constants'

// The takeover view, functionally similar to MaintenanceRunTakeover
export function RecoveryTakeover(props: {
  intent: ClientDataRecovery['intent']
  runStatus: ErrorRecoveryFlowsProps['runStatus']
  robotName: string
  isOnDevice: boolean
}): JSX.Element {
  const { runStatus } = props
  const { t } = useTranslation('error_recovery')
  const { clearClientData } = useUpdateClientDataRecovery()

  // TODO(jh, 07-29-24): This is likely sufficient for most edge cases, but this does not account for
  // all terminal commands as it should. Revisit this.
  const isTerminateDisabled = !(
    runStatus === RUN_STATUS_AWAITING_RECOVERY ||
    runStatus === RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR ||
    runStatus === RUN_STATUS_AWAITING_RECOVERY_PAUSED
  )

  const buildRecoveryTakeoverProps = (
    intent: ClientDataRecovery['intent']
  ): RecoveryTakeoverProps => {
    switch (intent) {
      case 'canceling':
        return {
          title: t('robot_is_canceling_run'),
          isRunStatusAwaitingRecovery: isTerminateDisabled,
          clearClientData,
          ...props,
        }
      case 'recovering':
      default:
        return {
          title: t('robot_is_in_recovery_mode'),
          isRunStatusAwaitingRecovery: isTerminateDisabled,
          clearClientData,
          ...props,
        }
    }
  }

  return (
    <RecoveryTakeoverComponent {...buildRecoveryTakeoverProps(props.intent)} />
  )
}

interface RecoveryTakeoverProps {
  title: string
  /* Do not let other users terminate activity if run is not awaiting recovery. Ex, the run is "recovery canceling." */
  isRunStatusAwaitingRecovery: boolean
  robotName: string
  isOnDevice: boolean
  clearClientData: UseUpdateClientDataRecoveryResult['clearClientData']
}

export function RecoveryTakeoverComponent(
  props: RecoveryTakeoverProps
): JSX.Element {
  return props.isOnDevice ? (
    <RecoveryTakeoverODD {...props} />
  ) : (
    <RecoveryTakeoverDesktop {...props} />
  )
}

export function RecoveryTakeoverODD({
  title,
  clearClientData,
  isRunStatusAwaitingRecovery,
}: RecoveryTakeoverProps): JSX.Element {
  const [showConfirmation, setShowConfirmation] = useState(false)

  return (
    <TakeoverModal
      title={title}
      confirmTerminate={clearClientData}
      setShowConfirmTerminateModal={setShowConfirmation}
      showConfirmTerminateModal={showConfirmation}
      terminateInProgress={isRunStatusAwaitingRecovery}
    />
  )
}

export function RecoveryTakeoverDesktop({
  title,
  robotName,
  clearClientData,
  isRunStatusAwaitingRecovery,
}: RecoveryTakeoverProps): JSX.Element {
  const { t } = useTranslation('error_recovery')

  const buildTitleHeadingDesktop = (): JSX.Element => {
    return (
      <StyledText desktopStyle="bodyLargeSemiBold">
        {t('error_on_robot', { robot: robotName })}
      </StyledText>
    )
  }

  return (
    <RecoveryInterventionModal
      titleHeading={buildTitleHeadingDesktop()}
      desktopType={'desktop-small'}
      isOnDevice={false}
    >
      <Flex css={BANNER_TEXT_CONTAINER_STYLE}>
        <Flex css={BANNER_TEXT_CONTENT_STYLE}>
          <Icon
            name="alert-circle"
            color={COLORS.red50}
            size={SPACING.spacing40}
          />
          <StyledText desktopStyle="headingSmallBold">{title}</StyledText>
          <StyledText desktopStyle="bodyDefaultRegular">
            {t('another_app_controlling_robot')}
          </StyledText>
        </Flex>
        <Flex marginLeft="auto">
          <AlertPrimaryButton
            onClick={clearClientData}
            disabled={isRunStatusAwaitingRecovery}
          >
            {t('terminate_remote_activity')}
          </AlertPrimaryButton>
        </Flex>
      </Flex>
    </RecoveryInterventionModal>
  )
}
