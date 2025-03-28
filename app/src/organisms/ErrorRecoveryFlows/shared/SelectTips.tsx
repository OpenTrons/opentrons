import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { RECOVERY_MAP } from '../constants'
import { RecoverySingleColumnContentWrapper } from './RecoveryContentWrapper'
import { TwoColumn } from '/app/molecules/InterventionModal'
import { RecoveryFooterButtons } from './RecoveryFooterButtons'
import { LeftColumnLabwareInfo } from './LeftColumnLabwareInfo'
import { TipSelectionModal } from './TipSelectionModal'
import { TipSelection } from './TipSelection'

import type { RecoveryContentProps } from '../types'

export function SelectTips(props: RecoveryContentProps): JSX.Element | null {
  const {
    routeUpdateActions,
    recoveryCommands,
    isOnDevice,
    failedLabwareUtils,
    failedPipetteUtils,
  } = props
  const { ROBOT_PICKING_UP_TIPS } = RECOVERY_MAP
  const { pickUpTips } = recoveryCommands
  const { isPartialTipConfigValid, failedPipetteInfo } = failedPipetteUtils
  const {
    goBackPrevStep,
    handleMotionRouting,
    proceedNextStep,
  } = routeUpdateActions
  const { t } = useTranslation('error_recovery')
  const [showTipSelectModal, setShowTipSelectModal] = useState(false)

  const primaryBtnOnClick = (): Promise<void> => {
    return handleMotionRouting(true, ROBOT_PICKING_UP_TIPS.ROUTE)
      .then(() => pickUpTips())
      .then(() => proceedNextStep())
  }

  const toggleModal = (): void => {
    setShowTipSelectModal(!showTipSelectModal)
  }

  const buildTertiaryBtnProps = (): {
    tertiaryBtnDisabled?: boolean
    tertiaryBtnOnClick?: () => void
    tertiaryBtnText?: string
  } => {
    // If partial tip config, do not give users the option to select tip location.
    if (isOnDevice && !isPartialTipConfigValid) {
      return {
        tertiaryBtnDisabled: failedPipetteInfo?.data.channels === 96,
        tertiaryBtnOnClick: toggleModal,
        tertiaryBtnText: t('change_location'),
      }
    } else {
      return {}
    }
  }

  const buildBannerText = (): string =>
    isPartialTipConfigValid
      ? t('replace_tips_and_select_loc_partial_tip')
      : t('replace_tips_and_select_location')

  return (
    <>
      {showTipSelectModal && (
        <TipSelectionModal
          {...props}
          allowTipSelection={!isPartialTipConfigValid}
          toggleModal={toggleModal}
        />
      )}
      <RecoverySingleColumnContentWrapper>
        <TwoColumn>
          <LeftColumnLabwareInfo
            {...props}
            title={t('select_tip_pickup_location')}
            type="location"
            bannerText={buildBannerText()}
            layout="default"
          />
          <TipSelection
            {...props}
            allowTipSelection={!isOnDevice && !isPartialTipConfigValid}
          />
        </TwoColumn>
        <RecoveryFooterButtons
          primaryBtnOnClick={primaryBtnOnClick}
          primaryBtnDisabled={!failedLabwareUtils.areTipsSelected}
          secondaryBtnOnClick={goBackPrevStep}
          primaryBtnTextOverride={t('pick_up_tips')}
          {...buildTertiaryBtnProps()}
        />
      </RecoverySingleColumnContentWrapper>
    </>
  )
}
