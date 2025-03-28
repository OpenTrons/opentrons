import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  LabwareRender,
  Module,
  MoveLabwareOnDeck,
  RESPONSIVENESS,
  SPACING,
  StyledText,
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

  const buildBody = (): string | null => {
    switch (selectedRecoveryOption) {
      case LOAD_LABWARE_SHUTTLE_AND_RETRY.ROUTE:
          return t('take_any_necessary_precautions_before_loading_shuttle')
      default:
        console.error(
          `TwoColTextAndImage:buildBannerText: Unexpected recovery option ${selectedRecoveryOption}. Handle retry step copy explicitly.`
        )
        return 'UNEXPECTED RECOVERY OPTION'
    }
  }

  const buildImage = (): JSX.Element => {
    return <Flex></Flex>
  }

  return (
    <RecoverySingleColumnContentWrapper>
      <TwoColumn>
         <Flex
              flexDirection={DIRECTION_COLUMN}
              css={`
                gap: ${SPACING.spacing16};
                width: 100%;
                @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
                  gap: ${SPACING.spacing8};
                  width: 27rem;
                }
              `}
            >
              <StyledText
                oddStyle="level4HeaderSemiBold"
                desktopStyle="headingSmallBold"
              >
                {buildTitle()}
              </StyledText>
              <Flex
                flexDirection={DIRECTION_COLUMN}
                css={`
                  gap: ${SPACING.spacing16};
                  width: 100%;
                  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
                    gap: ${SPACING.spacing24};
                  }
                `}
              >
                {/* <InterventionInfo {...infoProps} />
                {notificationProps ? (
                  <InlineNotification {...notificationProps} />
                ) : null} */}
              </Flex>
            </Flex>
            <Flex
              flexDirection={DIRECTION_COLUMN}
              css={`
                gap: ${SPACING.spacing16};
                width: 100%;
                @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
                  gap: ${SPACING.spacing8};
                  width: 27rem;
                }
              `}
            >
              <StyledText
                oddStyle="level4HeaderRegular"
                desktopStyle="bodyDefaultRegular"
              >
                {buildBody()}
              </StyledText>
              <Flex
                flexDirection={DIRECTION_COLUMN}
                css={`
                  gap: ${SPACING.spacing16};
                  width: 100%;
                  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
                    gap: ${SPACING.spacing24};
                  }
                `}
              >
                {/* <InterventionInfo {...infoProps} />
                {notificationProps ? (
                  <InlineNotification {...notificationProps} />
                ) : null} */}
              </Flex>
            </Flex>
        <Flex marginTop="0.7rem">{buildImage()}</Flex>
      </TwoColumn>
      <RecoveryFooterButtons primaryBtnOnClick={primaryOnClick} />
    </RecoverySingleColumnContentWrapper>
  )
}
