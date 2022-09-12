import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertModal,
  Box,
  ModalPage,
  SPACING_2,
  Text,
  useConditionalConfirm,
} from '@opentrons/components'
import { Portal } from '../../../App/portal'
import { useTrackEvent } from '../../../redux/analytics'
import { useRestartRun } from '../../ProtocolUpload/hooks'
import { useLabwarePositionCheck } from '../hooks'
import { DeprecatedIntroScreen } from './DeprecatedIntroScreen'
import { DeprecatedGenericStepScreen } from './DeprecatedGenericStepScreen'
import { DeprecatedSummaryScreen } from './DeprecatedSummaryScreen'
import { DeprecatedRobotMotionLoadingModal } from './DeprecatedRobotMotionLoadingModal'
import { DeprecatedConfirmPickUpTipModal } from './DeprecatedConfirmPickUpTipModal'
import { DeprecatedExitPreventionModal } from './DeprecatedExitPreventionModal'
import styles from './styles.css'

interface LabwarePositionCheckModalProps {
  onCloseClick: () => unknown
  runId: string
  caughtError?: Error
}

/**
 *
 * @deprecated Use {@link LabwarePositionCheckComponent instead}
 */
export const DeprecatedLabwarePositionCheckComponent = (
  props: LabwarePositionCheckModalProps
): JSX.Element | null => {
  const { t } = useTranslation(['labware_position_check', 'shared'])
  const restartRun = useRestartRun()
  const trackEvent = useTrackEvent()
  const [
    savePositionCommandData,
    savePositionCommandDataDispatch,
  ] = React.useReducer(
    (
      state: { [labwareId: string]: string[] },
      action: { labwareId: string; commandId: string }
    ) => {
      const { labwareId, commandId } = action
      const nextCommandList =
        state[labwareId] != null
          ? // if there are already two command ids, overwrite the second one with the new one coming in
            // this is used when there is an unsuccessful pick up tip, and additional pick up tip attempts occur
            [state[labwareId][0], commandId]
          : [commandId]
      return {
        ...state,
        [labwareId]: nextCommandList,
      }
    },
    {}
  )
  const [isRestartingRun, setIsRestartingRun] = React.useState<boolean>(false)
  const {
    confirm: confirmExitLPC,
    showConfirmation,
    cancel: cancelExitLPC,
  } = useConditionalConfirm(props.onCloseClick, true)

  // at the end of LPC, each labwareId will have 2 associated save position command ids which will be used to calculate the labware offsets
  const addSavePositionCommandData = (
    commandId: string,
    labwareId: string
  ): void => {
    savePositionCommandDataDispatch({ labwareId, commandId })
  }
  const labwarePositionCheckUtils = useLabwarePositionCheck(
    addSavePositionCommandData,
    savePositionCommandData
  )

  if ('error' in labwarePositionCheckUtils) {
    // show the modal for 5 seconds, then unmount and restart the run
    if (!isRestartingRun) {
      setTimeout(() => restartRun(), 5000)
      setIsRestartingRun(true)
      const { name, message } = labwarePositionCheckUtils.error
      trackEvent({
        name: 'labwarePositionCheckFailed',
        properties: { error: { message, name } },
      })
    }
    const { error } = labwarePositionCheckUtils
    return (
      <Portal level="top">
        <AlertModal
          heading={t('error_modal_header')}
          iconName={null}
          buttons={[
            {
              children: t('shared:close'),
              onClick: props.onCloseClick,
            },
          ]}
          alertOverlay
        >
          <Box>
            <Text marginTop={SPACING_2}>Error: {error.message}</Text>
          </Box>
        </AlertModal>
      </Portal>
    )
  }

  const {
    beginLPC,
    proceed,
    ctaText,
    currentCommandIndex,
    currentStep,
    showPickUpTipConfirmationModal,
    onUnsuccessfulPickUpTip,
    isComplete,
    titleText,
    isLoading,
    jog,
  } = labwarePositionCheckUtils

  let modalContent: JSX.Element
  if (isLoading) {
    modalContent = (
      <ModalPage
        contentsClassName={styles.modal_contents}
        titleBar={{
          title: t('labware_position_check_title'),
          back: {
            onClick: confirmExitLPC,
            title: t('shared:exit'),
            children: t('shared:exit'),
          },
        }}
      >
        <DeprecatedRobotMotionLoadingModal title={titleText} />
      </ModalPage>
    )
  } else if (showConfirmation) {
    modalContent = (
      <DeprecatedExitPreventionModal
        onGoBack={cancelExitLPC}
        onConfirmExit={confirmExitLPC}
      />
    )
  } else if (showPickUpTipConfirmationModal) {
    modalContent = (
      <ModalPage
        contentsClassName={styles.modal_contents}
        titleBar={{
          title: t('labware_position_check_title'),
          back: {
            onClick: confirmExitLPC,
            title: t('shared:exit'),
            children: t('shared:exit'),
          },
        }}
      >
        <DeprecatedConfirmPickUpTipModal
          confirmText={ctaText}
          onConfirm={proceed}
          onDeny={onUnsuccessfulPickUpTip}
        />
      </ModalPage>
    )
  } else if (isComplete) {
    modalContent = (
      // TODO: all of the following cases have the same modal page wrapper, we can DRY
      // this up by creating one wrapper and pass in children
      <ModalPage
        contentsClassName={styles.modal_contents}
        titleBar={{
          title: t('labware_position_check_title'),
          back: {
            onClick: confirmExitLPC,
            title: t('shared:exit'),
            children: t('shared:exit'),
          },
        }}
      >
        <DeprecatedSummaryScreen
          savePositionCommandData={savePositionCommandData}
          onCloseClick={props.onCloseClick}
        />
      </ModalPage>
    )
  } else if (currentCommandIndex !== 0) {
    modalContent = (
      <ModalPage
        contentsClassName={styles.modal_contents}
        titleBar={{
          title: t('labware_position_check_title'),
          back: {
            onClick: confirmExitLPC,
            title: t('shared:exit'),
            children: t('shared:exit'),
          },
        }}
      >
        <DeprecatedGenericStepScreen
          selectedStep={currentStep}
          ctaText={ctaText}
          proceed={proceed}
          title={titleText}
          jog={jog}
          runId={props.runId}
          savePositionCommandData={savePositionCommandData}
        />
      </ModalPage>
    )
  } else {
    modalContent = (
      <ModalPage
        contentsClassName={styles.modal_contents}
        titleBar={{
          title: t('labware_position_check_title'),
          back: {
            onClick: confirmExitLPC,
            title: t('shared:exit'),
            children: t('shared:exit'),
          },
        }}
      >
        <DeprecatedIntroScreen beginLPC={beginLPC} />
      </ModalPage>
    )
  }
  return <Portal level="top">{modalContent}</Portal>
}
