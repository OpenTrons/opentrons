import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  StyledText,
  SPACING,
  ALIGN_CENTER,
  JUSTIFY_END,
  RESPONSIVENESS,
  TEXT_ALIGN_CENTER,
} from '@opentrons/components'
import { RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR } from '@opentrons/api-client'

import {
  RecoverySingleColumnContentWrapper,
  RecoveryFooterButtons,
} from './shared'
import { RECOVERY_MAP } from './constants'

import type { RecoveryContentProps, RecoveryRoute, RouteStep } from './types'

// There are two code paths that render this component:
// 1) The door is open on a route & step in which it is not permitted to have the door open.
// 2) The door is open on a route & step in which it is permitted to have the door open, but the app manually redirects
// to this component. This is commonly done when the route & step itself allows the user to keep the door open, but some
// action on that route & step is about to occur that requires the door to be closed. In this case, once the door event
// has been satisfied, manually route back to the previous route & step.
// in case you need a custom "close the robot door" use RecoveryDoorOpenSpecial compnent with allowDoorOpen metadata set to true
export function RecoveryDoorOpen({
  recoveryActionMutationUtils,
  runStatus,
  routeUpdateActions,
  recoveryMap,
  recoveryCommands,
}: RecoveryContentProps): JSX.Element {
  const {
    resumeRecovery,
    isResumeRecoveryLoading,
  } = recoveryActionMutationUtils
  const {
    stashedMap,
    proceedToRouteAndStep,
    handleMotionRouting,
  } = routeUpdateActions
  console.log('recoveryMap: ', recoveryMap)
  const { t } = useTranslation('error_recovery')

  const handleHomeAllAndRoute = (
    route: RecoveryRoute,
    step?: RouteStep
  ): void => {
    void handleMotionRouting(true)
      .then(() => recoveryCommands.homeAll())
      .finally(() => handleMotionRouting(false))
      .then(() => proceedToRouteAndStep(route, step))
  }

  const primaryOnClick = (): void => {
    if (
      recoveryMap.route === RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.ROUTE
    ) {
      handleHomeAllAndRoute(
        RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.ROUTE,
        RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.STEPS.CONFIRM_RETRY
      )
    } else {
      void resumeRecovery().then(() => {
        // See comments above for why we do this.
        if (stashedMap != null) {
          void proceedToRouteAndStep(stashedMap.route, stashedMap.step)
        }
      })
    }
  }

  const buildSubtext = (): string => {
    if (
      recoveryMap.route === RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.ROUTE
    ) {
      return t('stacker_door_open_robot_home')
    } else {
      return t('close_the_robot_door')
    }
  }

  const buildTitletext = (): string => {
    if (
      recoveryMap.route === RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.ROUTE
    ) {
      return t('close_robot_and_stacker_door')
    } else {
      return t('robot_door_is_open')
    }
  }

  const buildPrimaryButtonText = (): string => {
    if (
      recoveryMap.route === RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.ROUTE
    ) {
      return t('continue')
    } else {
      return t('resume')
    }
  }

  return (
    <RecoverySingleColumnContentWrapper>
      <Flex
        padding={SPACING.spacing40}
        gridGap={SPACING.spacing24}
        flexDirection={DIRECTION_COLUMN}
        alignItems={ALIGN_CENTER}
        justifyContent={ALIGN_CENTER}
        flex="1"
      >
        <Icon
          css={ICON_STYLE}
          name="alert-circle"
          data-testid="recovery_door_alert_icon"
        />
        <Flex css={TEXT_STYLE}>
          <StyledText
            desktopStyle="headingSmallBold"
            oddStyle="level3HeaderBold"
          >
            {buildTitletext()}
          </StyledText>
          <StyledText
            desktopStyle="bodyDefaultRegular"
            oddStyle="level4HeaderRegular"
          >
            {buildSubtext()}
          </StyledText>
        </Flex>
      </Flex>
      <Flex justifyContent={JUSTIFY_END}>
        <RecoveryFooterButtons
          primaryBtnOnClick={primaryOnClick}
          primaryBtnTextOverride={buildPrimaryButtonText()}
          primaryBtnDisabled={
            runStatus === RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR
          }
          isLoadingPrimaryBtnAction={isResumeRecoveryLoading}
        />
      </Flex>
    </RecoverySingleColumnContentWrapper>
  )
}

const TEXT_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing8};
  align-items: ${ALIGN_CENTER};
  text-align: ${TEXT_ALIGN_CENTER};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    grid-gap: ${SPACING.spacing4};
  }
`

const ICON_STYLE = css`
  height: ${SPACING.spacing40};
  width: ${SPACING.spacing40};
  color: ${COLORS.yellow50};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: ${SPACING.spacing60};
    width: ${SPACING.spacing60};
  }
`
