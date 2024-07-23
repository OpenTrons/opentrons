import * as React from 'react'
import { useTranslation } from 'react-i18next'
import head from 'lodash/head'
import { css } from 'styled-components'

import {
  DIRECTION_COLUMN,
  COLORS,
  SPACING,
  Flex,
  StyledText,
  RESPONSIVENESS,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { RadioButton } from '../../../atoms/buttons'
import {
  ODD_SECTION_TITLE_STYLE,
  RECOVERY_MAP,
  ODD_ONLY,
  DESKTOP_ONLY,
} from '../constants'
import {
  RecoveryFooterButtons,
  RecoverySingleColumnContentWrapper,
  RecoveryRadioGroup,
} from '../shared'
import { DropTipWizardFlows } from '../../DropTipWizardFlows'
import { DT_ROUTES } from '../../DropTipWizardFlows/constants'
import { SelectRecoveryOption } from './SelectRecoveryOption'

import type { PipetteWithTip } from '../../DropTipWizardFlows'
import type { RecoveryContentProps } from '../types'
import type { FixitCommandTypeUtils } from '../../DropTipWizardFlows/types'

// The Drop Tip flow entry point. Includes entry from SelectRecoveryOption and CancelRun.
export function ManageTips(props: RecoveryContentProps): JSX.Element {
  const { recoveryMap } = props

  const buildContent = (): JSX.Element => {
    const { DROP_TIP_FLOWS } = RECOVERY_MAP
    const { step, route } = recoveryMap

    switch (step) {
      case DROP_TIP_FLOWS.STEPS.BEGIN_REMOVAL:
        return <BeginRemoval {...props} />
      case DROP_TIP_FLOWS.STEPS.BEFORE_BEGINNING:
      case DROP_TIP_FLOWS.STEPS.CHOOSE_BLOWOUT:
      case DROP_TIP_FLOWS.STEPS.CHOOSE_TIP_DROP:
        return <DropTipFlowsContainer {...props} />
      default:
        console.warn(`${step} in ${route} not explicitly handled. Rerouting.`)
        return <SelectRecoveryOption {...props} />
    }
  }

  return buildContent()
}

type RemovalOptions = 'begin-removal' | 'skip'

export function BeginRemoval({
  tipStatusUtils,
  routeUpdateActions,
  recoveryCommands,
  currentRecoveryOptionUtils,
}: RecoveryContentProps): JSX.Element | null {
  const { t } = useTranslation('error_recovery')
  const { pipettesWithTip } = tipStatusUtils
  const {
    proceedNextStep,
    setRobotInMotion,
    proceedToRouteAndStep,
  } = routeUpdateActions
  const { cancelRun } = recoveryCommands
  const { selectedRecoveryOption } = currentRecoveryOptionUtils
  const { ROBOT_CANCELING, RETRY_NEW_TIPS } = RECOVERY_MAP
  const mount = head(pipettesWithTip)?.mount

  const [selected, setSelected] = React.useState<RemovalOptions>(
    'begin-removal'
  )

  const primaryOnClick = (): void => {
    if (selected === 'begin-removal') {
      void proceedNextStep()
    } else {
      if (selectedRecoveryOption === RETRY_NEW_TIPS.ROUTE) {
        void proceedToRouteAndStep(
          RETRY_NEW_TIPS.ROUTE,
          RETRY_NEW_TIPS.STEPS.REPLACE_TIPS
        )
      } else {
        void setRobotInMotion(true, ROBOT_CANCELING.ROUTE).then(() => {
          cancelRun()
        })
      }
    }
  }

  const DESKTOP_ONLY_GRID_GAP = css`
    @media not (${RESPONSIVENESS.touchscreenMediaQuerySpecs}) {
      gap: 0rem;
    }
  `

  const RADIO_GROUP_STYLE = css`
    @media not (${RESPONSIVENESS.touchscreenMediaQuerySpecs}) {
      color: ${COLORS.black90};
      margin-left: 0.5rem;
    }
  `

  return (
    <RecoverySingleColumnContentWrapper css={DESKTOP_ONLY_GRID_GAP}>
      <StyledText
        css={ODD_SECTION_TITLE_STYLE}
        oddStyle="level4HeaderSemiBold"
        desktopStyle="headingSmallSemiBold"
      >
        {t('remove_tips_from_pipette', { mount })}
      </StyledText>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing2}
        css={ODD_ONLY}
      >
        <RadioButton
          buttonLabel={t('begin_removal')}
          buttonValue={t('begin_removal')}
          onChange={() => {
            setSelected('begin-removal')
          }}
          isSelected={selected === 'begin-removal'}
        />
        <RadioButton
          buttonLabel={t('skip_removal')}
          buttonValue={t('skip_removal')}
          onChange={() => {
            setSelected('skip')
          }}
          isSelected={selected === 'skip'}
        />
      </Flex>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        css={DESKTOP_ONLY}
      >
        <RecoveryRadioGroup
          css={css`
            padding: ${SPACING.spacing4};
          `}
          value={selected}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSelected(e.currentTarget.value as RemovalOptions)
          }}
          options={[
            {
              value: 'begin-removal',
              children: (
                <StyledText
                  desktopStyle="bodyDefaultRegular"
                  css={RADIO_GROUP_STYLE}
                >
                  {t('begin_removal')}
                </StyledText>
              ),
            },
            {
              value: 'skip',
              children: (
                <StyledText
                  desktopStyle="bodyDefaultRegular"
                  css={RADIO_GROUP_STYLE}
                >
                  {t('skip_removal')}
                </StyledText>
              ),
            },
          ]}
        />
      </Flex>
      <RecoveryFooterButtons primaryBtnOnClick={primaryOnClick} />
    </RecoverySingleColumnContentWrapper>
  )
}

function DropTipFlowsContainer(
  props: RecoveryContentProps
): JSX.Element | null {
  const {
    tipStatusUtils,
    routeUpdateActions,
    recoveryCommands,
    isFlex,
    currentRecoveryOptionUtils,
  } = props
  const { DROP_TIP_FLOWS, ROBOT_CANCELING, RETRY_NEW_TIPS } = RECOVERY_MAP
  const { proceedToRouteAndStep, setRobotInMotion } = routeUpdateActions
  const { selectedRecoveryOption } = currentRecoveryOptionUtils
  const { setTipStatusResolved } = tipStatusUtils
  const { cancelRun } = recoveryCommands

  const { mount, specs } = head(
    tipStatusUtils.pipettesWithTip
  ) as PipetteWithTip // Safe as we have to have tips to get to this point in the flow.

  const onCloseFlow = (): void => {
    if (selectedRecoveryOption === RETRY_NEW_TIPS.ROUTE) {
      void proceedToRouteAndStep(
        RETRY_NEW_TIPS.ROUTE,
        RETRY_NEW_TIPS.STEPS.REPLACE_TIPS
      )
    } else {
      void setTipStatusResolved(onEmptyCache, onTipsDetected)
    }
  }

  const onEmptyCache = (): void => {
    void setRobotInMotion(true, ROBOT_CANCELING.ROUTE).then(() => {
      cancelRun()
    })
  }

  const onTipsDetected = (): void => {
    void proceedToRouteAndStep(DROP_TIP_FLOWS.ROUTE)
  }

  const fixitCommandTypeUtils = useDropTipFlowUtils(props)

  return (
    <RecoverySingleColumnContentWrapper>
      <DropTipWizardFlows
        robotType={isFlex ? FLEX_ROBOT_TYPE : OT2_ROBOT_TYPE}
        closeFlow={onCloseFlow}
        mount={mount}
        instrumentModelSpecs={specs}
        fixitCommandTypeUtils={fixitCommandTypeUtils}
      />
    </RecoverySingleColumnContentWrapper>
  )
}

// Builds the overrides injected into DT Wiz.
export function useDropTipFlowUtils({
  tipStatusUtils,
  failedCommand,
  currentRecoveryOptionUtils,
  trackExternalMap,
  routeUpdateActions,
  recoveryMap,
}: RecoveryContentProps): FixitCommandTypeUtils {
  const { t } = useTranslation('error_recovery')
  const {
    RETRY_NEW_TIPS,
    ERROR_WHILE_RECOVERING,
    DROP_TIP_FLOWS,
  } = RECOVERY_MAP
  const { runId } = tipStatusUtils
  const { step } = recoveryMap
  const { selectedRecoveryOption } = currentRecoveryOptionUtils
  const { proceedToRouteAndStep } = routeUpdateActions
  const failedCommandId = failedCommand?.id ?? '' // We should have a failed command here unless the run is not in AWAITING_RECOVERY.

  const buildTipDropCompleteBtn = (): string => {
    switch (selectedRecoveryOption) {
      case RETRY_NEW_TIPS.ROUTE:
        return t('proceed_to_tip_selection')
      default:
        return t('proceed_to_cancel')
    }
  }

  const buildCopyOverrides = (): FixitCommandTypeUtils['copyOverrides'] => {
    return {
      tipDropCompleteBtnCopy: buildTipDropCompleteBtn(),
      beforeBeginningTopText: t('preserve_aspirated_liquid'),
    }
  }

  const buildErrorOverrides = (): FixitCommandTypeUtils['errorOverrides'] => {
    return {
      tipDropFailed: () => {
        return proceedToRouteAndStep(
          ERROR_WHILE_RECOVERING.ROUTE,
          ERROR_WHILE_RECOVERING.STEPS.DROP_TIP_TIP_DROP_FAILED
        )
      },
      blowoutFailed: () => {
        return proceedToRouteAndStep(
          ERROR_WHILE_RECOVERING.ROUTE,
          ERROR_WHILE_RECOVERING.STEPS.DROP_TIP_BLOWOUT_FAILED
        )
      },
      generalFailure: () =>
        proceedToRouteAndStep(
          ERROR_WHILE_RECOVERING.ROUTE,
          ERROR_WHILE_RECOVERING.STEPS.DROP_TIP_GENERAL_ERROR
        ),
    }
  }

  const buildButtonOverrides = (): FixitCommandTypeUtils['buttonOverrides'] => {
    return {
      goBackBeforeBeginning: () => {
        return proceedToRouteAndStep(DROP_TIP_FLOWS.ROUTE)
      },
    }
  }

  // If a specific step within the DROP_TIP_FLOWS route is selected, begin the Drop Tip Flows at its related route.
  const buildRouteOverride = (): FixitCommandTypeUtils['routeOverride'] => {
    switch (step) {
      case DROP_TIP_FLOWS.STEPS.CHOOSE_TIP_DROP:
        return DT_ROUTES.DROP_TIP
      case DROP_TIP_FLOWS.STEPS.CHOOSE_BLOWOUT:
        return DT_ROUTES.BLOWOUT
    }
  }

  return {
    runId,
    failedCommandId,
    copyOverrides: buildCopyOverrides(),
    trackCurrentMap: trackExternalMap,
    errorOverrides: buildErrorOverrides(),
    buttonOverrides: buildButtonOverrides(),
    routeOverride: buildRouteOverride(),
  }
}
