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
  SkipStepInfo,
} from '../shared'
import { SelectRecoveryOption } from './SelectRecoveryOption'

import type { RecoveryContentProps, RouteStep } from '../types'

export function ManualReplaceLwAndRetry(
  props: RecoveryContentProps
): JSX.Element {
  const { recoveryMap, doorStatusUtils } = props
  const { step, route } = recoveryMap
  const {
    MANUAL_REPLACE_AND_RETRY,
    MANUAL_REPLACE_STACKER_AND_RETRY,
    MANUAL_LOAD_IN_STACKER_AND_SKIP,
  } = RECOVERY_MAP

  const { t } = useTranslation('error_recovery')
  const { routeUpdateActions } = props
  const { proceedToRouteAndStep } = routeUpdateActions
  const primaryBtnOnClick = (): Promise<void> =>
    proceedToRouteAndStep(route, buildNextStep())

  const buildNextStep = (): RouteStep => {
    if (doorStatusUtils.isDoorOpen) {
      switch (route) {
        case RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.ROUTE:
          return RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.STEPS
            .CLOSE_DOOR_AND_HOME
        default:
          return MANUAL_LOAD_IN_STACKER_AND_SKIP.STEPS.CLOSE_DOOR_AND_HOME
      }
    } else {
      switch (route) {
        case RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.ROUTE:
          return RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.STEPS
            .CONFIRM_RETRY
        default:
          return MANUAL_LOAD_IN_STACKER_AND_SKIP.STEPS.MANUAL_REPLACE
      }
    }
  }

  const buildBodyText = (): JSX.Element => (
    <Trans
      t={t}
      i18nKey="carefully_clear_track"
      components={{ block: <LegacyStyledText as="p" /> }}
    />
  )
  const buildContent = (): JSX.Element => {
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
      case MANUAL_REPLACE_STACKER_AND_RETRY.STEPS.RETRY:
        return <RetryStepInfo {...props} />
      case MANUAL_LOAD_IN_STACKER_AND_SKIP.STEPS.SKIP:
        return <SkipStepInfo {...props} />
      default:
        console.warn(
          `ManualReplaceLwAndRetry: ${step} in ${route} not explicitly handled. Rerouting.`
        )
        return <SelectRecoveryOption {...props} />
    }
  }

  return buildContent()
}
