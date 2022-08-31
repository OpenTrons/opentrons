import * as React from 'react'
import { useTranslation } from 'react-i18next'

import {
  COLORS,
  SPACING,
  TEXT_TRANSFORM_CAPITALIZE,
} from '@opentrons/components'
import { CheckPipettesButton } from './CheckPipettesButton'
import { SimpleWizardBody } from '../../molecules/SimpleWizardBody'
import { PrimaryButton, SecondaryButton } from '../../atoms/buttons'

import type {
  PipetteNameSpecs,
  PipetteModelSpecs,
  PipetteDisplayCategory,
} from '@opentrons/shared-data'
import type { PipetteOffsetCalibration } from '../../redux/calibration/types'

export interface ConfirmPipetteProps {
  robotName: string
  success: boolean
  attachedWrong: boolean
  wantedPipette: PipetteNameSpecs | null
  actualPipette: PipetteModelSpecs | null
  actualPipetteOffset: PipetteOffsetCalibration | null
  displayName: string
  displayCategory: PipetteDisplayCategory | null
  tryAgain: () => void
  exit: () => void
  toCalibrationDashboard: () => void
}

export function ConfirmPipette(props: ConfirmPipetteProps): JSX.Element {
  const { success } = props
  const { t } = useTranslation('change_pipette')

  const getPipetteStatusDetails = (
    props: ConfirmPipetteProps
  ): { header: string; subHeader: string } => {
    const { displayName, wantedPipette, attachedWrong, success } = props
    let header
    let subHeader

    if (wantedPipette && success) {
      header = t('pipette_attached')
      subHeader = t('pipette_is_ready_to_use', {
        pipette: wantedPipette.displayName,
      })
    } else if (wantedPipette) {
      header = attachedWrong
        ? t('incorrect_pipette_attached')
        : t('unable_to_detect_pipette', {
            pipette: wantedPipette.displayName ?? 'pipette',
          })

      subHeader = attachedWrong
        ? t('attached_pipette_does_not_match', {
            name: displayName,
            pipette: wantedPipette.displayName,
          })
        : t('press_white_connector')
    } else {
      header = success
        ? t('successfully_detached_pipette')
        : t('pipette_still_detected')
      subHeader = success ? '' : t('check_pipette_is_unplugged')
    }

    return { header, subHeader }
  }

  const { header, subHeader } = getPipetteStatusDetails({ ...props })

  return (
    <SimpleWizardBody
      iconColor={success ? COLORS.successEnabled : COLORS.errorEnabled}
      header={header}
      subHeader={subHeader}
      isSuccess={success}
    >
      <>
        {!success && <TryAgainButton {...props} />}
        {success && <SuccessAndExitButtons {...props} />}
      </>
    </SimpleWizardBody>
  )
}

function TryAgainButton(props: ConfirmPipetteProps): JSX.Element {
  const {
    actualPipette,
    attachedWrong,
    wantedPipette,
    robotName,
    tryAgain,
    exit,
  } = props
  const { t } = useTranslation('change_pipette')
  if (wantedPipette && attachedWrong) {
    return (
      <>
        <SecondaryButton marginRight={SPACING.spacing3} onClick={exit}>
          {t('use_attached_pipette')}
        </SecondaryButton>
        <PrimaryButton onClick={tryAgain}>
          {t('detatch_try_again')}
        </PrimaryButton>
      </>
    )
  } else if (!actualPipette) {
    return (
      <>
        <SecondaryButton marginRight={SPACING.spacing3} onClick={exit}>
          {t('cancel_attachment')}
        </SecondaryButton>
        <CheckPipettesButton robotName={robotName}>
          {t('recheck_connection')}
        </CheckPipettesButton>
      </>
    )
  }
  return (
    <>
      <SecondaryButton marginRight={SPACING.spacing3} onClick={exit}>
        {t('leave_attached')}
      </SecondaryButton>
      <PrimaryButton onClick={tryAgain}>{t('try_again')}</PrimaryButton>
    </>
  )
}

function SuccessAndExitButtons(props: ConfirmPipetteProps): JSX.Element {
  const {
    actualPipette,
    actualPipetteOffset,
    exit,
    toCalibrationDashboard,
    success,
  } = props
  const { t } = useTranslation('change_pipette')
  return (
    <>
      {success && actualPipette && !actualPipetteOffset && (
        <SecondaryButton
          marginRight={SPACING.spacing3}
          onClick={toCalibrationDashboard}
        >
          {t('calibrate_pipette_offset')}
        </SecondaryButton>
      )}
      <PrimaryButton textTransform={TEXT_TRANSFORM_CAPITALIZE} onClick={exit}>
        {t('shared:exit')}
      </PrimaryButton>
    </>
  )
}
