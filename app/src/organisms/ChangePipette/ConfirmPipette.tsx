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
import { LevelPipette } from './LevelPipette'

import type {
  PipetteNameSpecs,
  PipetteModelSpecs,
  PipetteDisplayCategory,
} from '@opentrons/shared-data'
import type { PipetteOffsetCalibration } from '../../redux/calibration/types'
import type { Mount } from '../../redux/pipettes/types'

export interface ConfirmPipetteProps {
  robotName: string
  success: boolean
  attachedWrong: boolean
  wantedPipette: PipetteNameSpecs | null
  actualPipette: PipetteModelSpecs | null
  actualPipetteOffset: PipetteOffsetCalibration | null
  displayName: string
  displayCategory: PipetteDisplayCategory | null
  mount: Mount
  useWrongWantedPipette: PipetteNameSpecs | null
  setWrongWantedPipette: React.Dispatch<
    React.SetStateAction<PipetteNameSpecs | null>
  >
  confirmPipetteLevel: boolean
  setConfirmPipetteLevel: React.Dispatch<React.SetStateAction<boolean>>
  tryAgain: () => void
  exit: () => void
  toCalibrationDashboard: () => void
}

export interface SuccessAndExitProps extends ConfirmPipetteProps {
  confirmPipetteLevel: boolean
}

export function ConfirmPipette(props: ConfirmPipetteProps): JSX.Element {
  const {
    success,
    mount,
    tryAgain,
    useWrongWantedPipette,
    actualPipette,
    setConfirmPipetteLevel,
    confirmPipetteLevel,
  } = props
  const { t } = useTranslation('change_pipette')

  const getPipetteStatusDetails = (
    props: ConfirmPipetteProps
  ): { header: string; subHeader: string } => {
    const {
      displayName,
      wantedPipette,
      attachedWrong,
      actualPipette,
      success,
    } = props
    let header
    let subHeader

    if ((wantedPipette && success) || useWrongWantedPipette) {
      header = t('pipette_attached')
      subHeader = t('pipette_is_ready_to_use', {
        pipette: useWrongWantedPipette
          ? actualPipette?.displayName
          : wantedPipette?.displayName,
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

  return !confirmPipetteLevel &&
    useWrongWantedPipette &&
    actualPipette != null &&
    actualPipette.channels === 8 ? (
    <LevelPipette
      mount={mount}
      pipetteModelName={actualPipette.name}
      back={tryAgain}
      confirm={() => setConfirmPipetteLevel(true)}
    />
  ) : (
    <SimpleWizardBody
      iconColor={
        success || useWrongWantedPipette || confirmPipetteLevel
          ? COLORS.successEnabled
          : COLORS.errorEnabled
      }
      header={header}
      subHeader={subHeader}
      isSuccess={success}
    >
      <>
        {!success && !useWrongWantedPipette && !confirmPipetteLevel && (
          <TryAgainButton {...props} />
        )}
        {success || useWrongWantedPipette || confirmPipetteLevel ? (
          <SuccessAndExitButtons
            {...props}
            confirmPipetteLevel={confirmPipetteLevel}
          />
        ) : null}
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
    setWrongWantedPipette,
    useWrongWantedPipette,
  } = props
  const { t } = useTranslation('change_pipette')

  if (wantedPipette && attachedWrong && !useWrongWantedPipette) {
    return (
      <>
        <SecondaryButton
          marginRight={SPACING.spacing3}
          onClick={() => setWrongWantedPipette(actualPipette)}
        >
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

function SuccessAndExitButtons(props: SuccessAndExitProps): JSX.Element {
  const {
    actualPipette,
    actualPipetteOffset,
    exit,
    toCalibrationDashboard,
    success,
    useWrongWantedPipette,
    confirmPipetteLevel,
  } = props
  const { t } = useTranslation('change_pipette')
  return (
    <>
      {useWrongWantedPipette ||
      (success && actualPipette && !actualPipetteOffset) ||
      confirmPipetteLevel ? (
        <SecondaryButton
          marginRight={SPACING.spacing3}
          onClick={toCalibrationDashboard}
        >
          {t('calibrate_pipette_offset')}
        </SecondaryButton>
      ) : null}
      <PrimaryButton textTransform={TEXT_TRANSFORM_CAPITALIZE} onClick={exit}>
        {t('shared:exit')}
      </PrimaryButton>
    </>
  )
}
