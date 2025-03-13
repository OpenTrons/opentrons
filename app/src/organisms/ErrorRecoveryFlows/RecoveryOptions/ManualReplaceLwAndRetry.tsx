import { Trans, useTranslation } from 'react-i18next'
import { LegacyStyledText } from '@opentrons/components'
import { RECOVERY_MAP } from '../constants'
import {
  GripperIsHoldingLabware,
  GripperReleaseLabware,
  TwoColLwInfoAndDeck,
  TwoColTextAndFailedStepNextStep,
  RetryStepInfo,
  RecoveryDoorOpenSpecial,
} from '../shared'
import { SelectRecoveryOption } from './SelectRecoveryOption'

import type { RecoveryContentProps } from '../types'

export function ManualReplaceLwAndRetry(
  props: RecoveryContentProps
): JSX.Element {
  const { recoveryMap, doorStatusUtils } = props
  const { step, route } = recoveryMap
  const {
    MANUAL_REPLACE_AND_RETRY,
    MANUAL_REPLACE_STACKER_AND_RETRY,
  } = RECOVERY_MAP

  console.log('maunally moving')

  const { t } = useTranslation('error_recovery')
  const { routeUpdateActions } = props
  const { proceedToRouteAndStep } = routeUpdateActions
  const primaryBtnOnClick = (): Promise<void> =>
    proceedToRouteAndStep(
      RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.ROUTE,
      doorStatusUtils.isDoorOpen
        ? RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.STEPS
            .CLOSE_DOOR_AND_HOME
        : RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.STEPS.CONFIRM_RETRY
    )
  const buildBodyText = (): JSX.Element => (
    <Trans
      t={t}
      i18nKey="carefully_clear_track"
      components={{ block: <LegacyStyledText as="p" /> }}
    />
  )
  const buildContent = (): JSX.Element => {
    console.log('building contenct')
    switch (step) {
      case MANUAL_REPLACE_AND_RETRY.STEPS.GRIPPER_HOLDING_LABWARE:
        return <GripperIsHoldingLabware {...props} />
      case MANUAL_REPLACE_AND_RETRY.STEPS.GRIPPER_RELEASE_LABWARE:
        return <GripperReleaseLabware {...props} />
      case MANUAL_REPLACE_AND_RETRY.STEPS.CLOSE_DOOR_GRIPPER_Z_HOME:
        return <RecoveryDoorOpenSpecial {...props} />
      case MANUAL_REPLACE_AND_RETRY.STEPS.MANUAL_REPLACE:
      case MANUAL_REPLACE_STACKER_AND_RETRY.STEPS.CONFIRM_RETRY:
        return <TwoColLwInfoAndDeck {...props} />
      case MANUAL_REPLACE_STACKER_AND_RETRY.STEPS.PREPARE_TRACK_FOR_HOMING:
        return (
          <TwoColTextAndFailedStepNextStep
            {...props}
            leftColTitle={t('prepare_track_for_homing')}
            leftColBodyText={buildBodyText()}
            primaryBtnCopy={t('continue')}
            primaryBtnOnClick={primaryBtnOnClick}
          />
        )
      case MANUAL_REPLACE_AND_RETRY.STEPS.RETRY:
        return <RetryStepInfo {...props} />
      default:
        console.warn(
          `ManualReplaceLwAndRetry: ${step} in ${route} not explicitly handled. Rerouting.`
        )
        return <SelectRecoveryOption {...props} />
    }
  }

  return buildContent()
}
