import { css } from 'styled-components'
import { createPortal } from 'react-dom'

import {
  DIRECTION_COLUMN,
  Flex,
  RESPONSIVENESS,
  SPACING,
  POSITION_FIXED,
  ModalShell,
  PrimaryButton,
  JUSTIFY_SPACE_BETWEEN,
  ALIGN_CENTER,
  SecondaryButton,
  Box,
} from '@opentrons/components'

import { StepMeter } from '/app/atoms/StepMeter'
// TODO(jh, 02-05-25): Move ChildNavigation to molecules.
// eslint-disable-next-line opentrons/no-imports-across-applications
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { useSelector } from 'react-redux'
import {
  LPC_STEP,
  selectCurrentStep,
  selectStepInfo,
} from '/app/redux/protocol-runs'
import { WizardHeader } from '/app/molecules/WizardHeader'
import { getModalPortalEl } from '/app/App/portal'
import { getIsOnDevice } from '/app/redux/config'
import { NeedHelpLink } from '/app/molecules/OT2CalibrationNeedHelpLink'

import type { ReactNode } from 'react'
import type { FlattenSimpleInterpolation } from 'styled-components'
// eslint-disable-next-line opentrons/no-imports-across-applications
import type { ChildNavigationProps } from '/app/organisms/ODD/ChildNavigation'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

interface LPCContentContainerTertiaryBtnProps {
  onClick: () => void
  text: ReactNode
}

// TOME TODO: Exit button behavior on LPC complete in the header should just exit, not
//  redo the flow again (if this happens). It seems a bit jank when doing detach and other flows, too.

export type LPCContentContainerProps = LPCWizardContentProps &
  Partial<ChildNavigationProps> & {
    children: JSX.Element
    header: string
    /* An optional style override for the content container. */
    contentStyle?: FlattenSimpleInterpolation
    /* An optional style override for the container. */
    containerStyle?: FlattenSimpleInterpolation
    /* The desktop button the left of the primary button. */
    tertiaryBtnProps?: LPCContentContainerTertiaryBtnProps
  }

export function LPCContentContainer(
  props: LPCContentContainerProps
): JSX.Element {
  const { runId, children, contentStyle, containerStyle, ...rest } = props
  const { commandUtils } = rest
  const { currentStepIndex, totalStepCount } = useSelector(
    selectStepInfo(runId)
  )
  const isOnDevice = useSelector(getIsOnDevice)
  const showDesktopFooter = !commandUtils.isRobotMoving

  return (
    <>
      {isOnDevice ? (
        <Flex css={containerStyle ?? ODD_CONTAINER_STYLE}>
          <Flex css={FIXED_HEADER_STYLE}>
            <StepMeter
              totalSteps={totalStepCount}
              currentStep={currentStepIndex + 1}
            />
            <ChildNavigation {...rest} css={CHILD_NAV_STYLE} />
          </Flex>
          <Flex css={contentStyle ?? ODD_CHILDREN_CONTAINER_STYLE}>
            {children}
          </Flex>
        </Flex>
      ) : (
        createPortal(
          <ModalShell
            css={containerStyle ?? DESKTOP_CONTAINER_STYLE}
            header={
              <WizardHeader
                title={rest.header}
                onExit={commandUtils.headerCommands.handleNavToDetachProbe}
                currentStep={currentStepIndex + 1}
                totalSteps={totalStepCount}
                hideStepText={true}
              />
            }
          >
            <Flex css={contentStyle ?? DESKTOP_CHILDREN_CONTAINER_STYLE}>
              {children}
              {showDesktopFooter && <DesktopFooterContent {...props} />}
            </Flex>
          </ModalShell>,
          getModalPortalEl()
        )
      )}
    </>
  )
}

// TOME TODO: Think through the button props for here. It's not the secondary button
// unfortunately.
function DesktopFooterContent({
  runId,
  buttonText,
  buttonIsDisabled,
  tertiaryBtnProps,
  onClickButton,
}: Omit<LPCContentContainerProps, 'children'>): JSX.Element {
  const step = useSelector(selectCurrentStep(runId))
  const showHelpLink = step !== LPC_STEP.LPC_COMPLETE

  return (
    <Flex css={DESKTOP_FOOTER_CONTENT_CONTAINER}>
      {/* TODO(jh, 03-11-25): Update the link/styling after Product/Design provide input. */}
      {showHelpLink ? <NeedHelpLink /> : <Box />}
      <Flex css={DESKTOP_FOOTER_BTN_CONTAINER}>
        {tertiaryBtnProps != null && (
          <SecondaryButton onClick={tertiaryBtnProps.onClick}>
            {tertiaryBtnProps.text}
          </SecondaryButton>
        )}
        <PrimaryButton disabled={buttonIsDisabled} onClick={onClickButton}>
          {buttonText}
        </PrimaryButton>
      </Flex>
    </Flex>
  )
}

const DESKTOP_CONTAINER_STYLE = css`
  height: 28.125rem;
  width: 47rem;
`

const ODD_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  height: 100vh;
`

// TODO(jh, 03-12-25): This should be a fixed value in components.
const FIXED_HEADER_STYLE = css`
  position: ${POSITION_FIXED};
  top: 0;
  left: 0;
  right: 0;
  flex-direction: ${DIRECTION_COLUMN};
`

const DESKTOP_CHILDREN_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  padding: ${SPACING.spacing24};
  gap: ${SPACING.spacing24};
  height: 24.125rem;
  overflow-y: auto;
`

// TODO(jh, 02-05-25): Investigate whether we can remove the position: fixed styling from ChildNav.
const CHILD_NAV_STYLE = css`
  margin-top: ${SPACING.spacing8};
`
const ODD_CHILDREN_CONTAINER_STYLE = css`
  margin-top: 7.75rem;
  flex-direction: ${DIRECTION_COLUMN};
  height: 100%;
  overflow-y: auto;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    padding: ${SPACING.spacing32} ${SPACING.spacing60} ${SPACING.spacing40}
      ${SPACING.spacing60};
    gap: ${SPACING.spacing40};
  }
`

const DESKTOP_FOOTER_CONTENT_CONTAINER = css`
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
  gap: ${SPACING.spacing8};
  margin-top: auto;
`

const DESKTOP_FOOTER_BTN_CONTAINER = css`
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
  gap: ${SPACING.spacing8};
`
