import {
  COLORS,
  Flex,
  LabwareRender,
  Module,
  MoveLabwareOnDeck,
} from '@opentrons/components'
import { inferModuleOrientationFromXCoordinate } from '@opentrons/shared-data'

import { useTranslation } from 'react-i18next'
import { RecoverySingleColumnContentWrapper } from './RecoveryContentWrapper'
import { TwoColumn } from '/app/molecules/InterventionModal'
import { RecoveryFooterButtons } from './RecoveryFooterButtons'
import { LeftColumnLabwareInfo } from './LeftColumnLabwareInfo'
import { InterventionInfo } from '/app/molecules/InterventionModal/InterventionContent'
import { RECOVERY_MAP } from '../constants'

import type { ComponentProps } from 'react'
import type { RecoveryContentProps } from '../types'
import type { InterventionContent } from '/app/molecules/InterventionModal/InterventionContent'

export function TwoColTextAndImage(
  props: RecoveryContentProps
): JSX.Element | null {
  const {
    routeUpdateActions,
    failedPipetteUtils,
    failedLabwareUtils,
    currentRecoveryOptionUtils,
    recoveryMap,
  } = props
  const {
    RETRY_NEW_TIPS,
    SKIP_STEP_WITH_NEW_TIPS,
    MANUAL_MOVE_AND_SKIP,
    MANUAL_REPLACE_AND_RETRY,
    HOME_AND_RETRY,
    MANUAL_REPLACE_STACKER_AND_RETRY,
    MANUAL_LOAD_IN_STACKER_AND_SKIP,
    LOAD_LABWARE_SHUTTLE_AND_RETRY,
  } = RECOVERY_MAP
  const { selectedRecoveryOption } = currentRecoveryOptionUtils
  const { relevantWellName, failedLabware } = failedLabwareUtils
  const { proceedNextStep } = routeUpdateActions
  const { step } = recoveryMap
  const { failedPipetteInfo, isPartialTipConfigValid } = failedPipetteUtils
  const { t } = useTranslation('error_recovery')

  const primaryOnClick = (): void => {
    void proceedNextStep()
  }

  const {
    displayNameCurrentLoc: slot,
  } = failedLabwareUtils.failedLabwareLocations

  const buildTitle = (): string => {
    switch (selectedRecoveryOption) {
      case MANUAL_MOVE_AND_SKIP.ROUTE:
        return t('manually_move_lw_on_deck')
      case MANUAL_REPLACE_AND_RETRY.ROUTE:
        return t('manually_replace_lw_on_deck')
      case HOME_AND_RETRY.ROUTE:
      case RETRY_NEW_TIPS.ROUTE:
      case SKIP_STEP_WITH_NEW_TIPS.ROUTE: {
        // Only special case the "full" 96-channel nozzle config.
        if (
          failedPipetteInfo?.data.channels === 96 &&
          !isPartialTipConfigValid
        ) {
          return t('replace_with_new_tip_rack', { slot })
        } else {
          return t('replace_used_tips_in_rack_location', {
            location: relevantWellName,
            slot,
          })
        }
      }
      case MANUAL_REPLACE_STACKER_AND_RETRY.ROUTE:
        return t('ensure_stacker_has_labware')
      case MANUAL_LOAD_IN_STACKER_AND_SKIP.ROUTE:
        if (step === MANUAL_LOAD_IN_STACKER_AND_SKIP.STEPS.MANUAL_REPLACE) {
          return t('load_labware_into_labware_shuttle')
        } else {
          return t('ensure_stacker_has_labware')
        }
      case LOAD_LABWARE_SHUTTLE_AND_RETRY.ROUTE:
        return t('load_labware_shuttle_onto_track')
      default:
        console.error(
          `TwoColTextAndImage: Unexpected recovery option: ${selectedRecoveryOption}. Handle retry step copy explicitly.`
        )
        return 'UNEXPECTED RECOVERY OPTION'
    }
  }

  const buildBannerText = (): string | null => {
    switch (selectedRecoveryOption) {
      case MANUAL_MOVE_AND_SKIP.ROUTE:
      case MANUAL_REPLACE_AND_RETRY.ROUTE:
        return t('ensure_lw_is_accurately_placed')
      case RETRY_NEW_TIPS.ROUTE:
      case SKIP_STEP_WITH_NEW_TIPS.ROUTE:
      case HOME_AND_RETRY.ROUTE: {
        return isPartialTipConfigValid
          ? t('replace_tips_and_select_loc_partial_tip')
          : t('replace_tips_and_select_location')
      }
      case MANUAL_REPLACE_STACKER_AND_RETRY.ROUTE:
        return t('make_sure_loaded_correct_number_of_labware_stacker')
      case MANUAL_LOAD_IN_STACKER_AND_SKIP.ROUTE:
        if (step === MANUAL_LOAD_IN_STACKER_AND_SKIP.STEPS.MANUAL_REPLACE) {
          return null
        } else {
          return t('make_sure_loaded_correct_number_of_labware_stacker')
        }
      default:
        console.error(
          `TwoColTextAndImage:buildBannerText: Unexpected recovery option ${selectedRecoveryOption}. Handle retry step copy explicitly.`
        )
        return 'UNEXPECTED RECOVERY OPTION'
    }
  }

  const buildType = (): ComponentProps<
    typeof InterventionContent
  >['infoProps']['type'] => {
    switch (selectedRecoveryOption) {
      case MANUAL_MOVE_AND_SKIP.ROUTE:
        return 'location-arrow-location'
      default:
      case MANUAL_REPLACE_AND_RETRY.ROUTE:
      case MANUAL_REPLACE_STACKER_AND_RETRY.ROUTE:
        return 'location'
    }
  }

  const buildImage = (): JSX.Element => {
    return <Flex></Flex>
  }

  return (
    <RecoverySingleColumnContentWrapper>
      <TwoColumn>
        <div>{buildTitle()}</div>
        <Flex marginTop="0.7rem">{buildImage()}</Flex>
      </TwoColumn>
      <RecoveryFooterButtons primaryBtnOnClick={primaryOnClick} />
    </RecoverySingleColumnContentWrapper>
  )
}
