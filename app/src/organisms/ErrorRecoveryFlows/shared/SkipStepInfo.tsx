import { Trans, useTranslation } from 'react-i18next'

import { LegacyStyledText } from '@opentrons/components'

import { RECOVERY_MAP } from '../constants'
import { TwoColTextAndFailedStepNextStep } from './TwoColTextAndFailedStepNextStep'

import type { RecoveryContentProps } from '../types'

export function SkipStepInfo(props: RecoveryContentProps): JSX.Element {
  const {
    recoveryCommands,
    routeUpdateActions,
    currentRecoveryOptionUtils,
  } = props
  const {
    SKIP_STEP_WITH_SAME_TIPS,
    SKIP_STEP_WITH_NEW_TIPS,
    MANUAL_MOVE_AND_SKIP,
    IGNORE_AND_SKIP,
    MANUAL_LOAD_IN_STACKER_AND_SKIP,
  } = RECOVERY_MAP
  const { selectedRecoveryOption } = currentRecoveryOptionUtils
  const { skipFailedCommand } = recoveryCommands
  const { moveLabwareWithoutPause } = recoveryCommands
  const { handleMotionRouting } = routeUpdateActions
  const { ROBOT_SKIPPING_STEP } = RECOVERY_MAP
  const { t } = useTranslation('error_recovery')

  const primaryBtnOnClick = (): Promise<void> => {
    return handleMotionRouting(true, ROBOT_SKIPPING_STEP.ROUTE).then(() => {
      if (selectedRecoveryOption === MANUAL_MOVE_AND_SKIP.ROUTE) {
        void moveLabwareWithoutPause().then(() => {
          skipFailedCommand()
        })
      } else {
        skipFailedCommand()
      }
    })
  }

  const buildTitleCopy = (): string => {
    switch (selectedRecoveryOption) {
      case SKIP_STEP_WITH_SAME_TIPS.ROUTE:
        return t('skip_to_next_step_same_tips')
      case SKIP_STEP_WITH_NEW_TIPS.ROUTE:
        return t('skip_to_next_step_new_tips')
      case IGNORE_AND_SKIP.ROUTE:
      case MANUAL_MOVE_AND_SKIP.ROUTE:
      case MANUAL_LOAD_IN_STACKER_AND_SKIP.ROUTE:
        return t('skip_to_next_step')
      default:
        console.error(
          'Unhandled skip step copy. Add the recovery option explicitly.'
        )
        return 'UNEXPECTED STEP'
    }
  }

  const buildBodyCopyKey = (): string => {
    switch (selectedRecoveryOption) {
      case IGNORE_AND_SKIP.ROUTE:
        return 'inspect_the_robot'
      case SKIP_STEP_WITH_SAME_TIPS.ROUTE:
      case SKIP_STEP_WITH_NEW_TIPS.ROUTE:
        return 'failed_dispense_step_not_completed'
      case MANUAL_MOVE_AND_SKIP.ROUTE:
      case MANUAL_LOAD_IN_STACKER_AND_SKIP.ROUTE:
        return 'robot_not_attempt_to_move_lw'
      default:
        console.error(
          'Unhandled skip step copy. Add the recovery option explicitly.'
        )
        return 'UNEXPECTED STEP'
    }
  }
  const buildBodyText = (): JSX.Element => {
    return (
      <Trans
        t={t}
        i18nKey={buildBodyCopyKey()}
        components={{
          block: <LegacyStyledText as="p" />,
        }}
      />
    )
  }

  return (
    <TwoColTextAndFailedStepNextStep
      {...props}
      leftColTitle={buildTitleCopy()}
      leftColBodyText={buildBodyText()}
      primaryBtnOnClick={primaryBtnOnClick}
      primaryBtnCopy={t('continue_run_now')}
    />
  )
}
