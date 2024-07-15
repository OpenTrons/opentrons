import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  COLORS,
  SecondaryButton,
  PrimaryButton,
  RESPONSIVENESS,
} from '@opentrons/components'

import { SmallButton } from '../../../atoms/buttons'

interface RecoveryFooterButtonProps {
  primaryBtnOnClick: () => void
  /* The "Go back" button */
  secondaryBtnOnClick?: () => void
  primaryBtnTextOverride?: string
  /* If true, render pressed state and a spinner icon for the primary button. */
  isLoadingPrimaryBtnAction?: boolean
  /* To the left of the primary button. */
  tertiaryBtnOnClick?: () => void
  tertiaryBtnText?: string
  tertiaryBtnDisabled?: boolean
}
export function RecoveryFooterButtons(
  props: RecoveryFooterButtonProps
): JSX.Element | null {
  return (
    <Flex
      width="100%"
      height="100%"
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      alignItems={ALIGN_CENTER}
      gridGap={SPACING.spacing8}
    >
      <RecoveryGoBackButton {...props} />
      <PrimaryButtonGroup {...props} />
    </Flex>
  )
}

function RecoveryGoBackButton({
  secondaryBtnOnClick,
}: RecoveryFooterButtonProps): JSX.Element | null {
  const showGoBackBtn = secondaryBtnOnClick != null
  const { t } = useTranslation('error_recovery')
  return showGoBackBtn ? (
    <Flex marginTop="auto">
      <SmallButton
        buttonType="tertiaryLowLight"
        buttonText={t('go_back')}
        onClick={secondaryBtnOnClick}
        marginTop="auto"
        css={ODD_ONLY_BUTTON}
      />
      <SecondaryButton onClick={secondaryBtnOnClick} css={DESKTOP_ONLY_BUTTON}>
        {t('go_back')}
      </SecondaryButton>
    </Flex>
  ) : null
}

function PrimaryButtonGroup(props: RecoveryFooterButtonProps): JSX.Element {
  const { tertiaryBtnOnClick, tertiaryBtnText } = props

  const renderTertiaryBtn =
    tertiaryBtnOnClick != null || tertiaryBtnText != null

  if (!renderTertiaryBtn) {
    return (
      <Flex marginTop="auto">
        <RecoveryPrimaryBtn {...props} />
      </Flex>
    )
  } else {
    return (
      <Flex gridGap={SPACING.spacing8} marginTop="auto">
        <RecoveryTertiaryBtn {...props} />
        <RecoveryPrimaryBtn {...props} />
      </Flex>
    )
  }
}

function RecoveryPrimaryBtn({
  isLoadingPrimaryBtnAction,
  primaryBtnOnClick,
  primaryBtnTextOverride,
}: RecoveryFooterButtonProps): JSX.Element {
  const { t } = useTranslation('error_recovery')

  return (
    <>
      <SmallButton
        css={
          isLoadingPrimaryBtnAction
            ? css`
                ${PRESSED_LOADING_STATE} ${ODD_ONLY_BUTTON}
              `
            : ODD_ONLY_BUTTON
        }
        iconName={isLoadingPrimaryBtnAction ? 'ot-spinner' : null}
        iconPlacement={isLoadingPrimaryBtnAction ? 'startIcon' : null}
        buttonType="primary"
        buttonText={primaryBtnTextOverride ?? t('continue')}
        onClick={primaryBtnOnClick}
        marginTop="auto"
      />
      <PrimaryButton
        css={DESKTOP_ONLY_BUTTON}
        onClick={primaryBtnOnClick}
        disabled={isLoadingPrimaryBtnAction}
      >
        {primaryBtnTextOverride ?? t('continue')}
      </PrimaryButton>
    </>
  )
}

function RecoveryTertiaryBtn({
  tertiaryBtnOnClick,
  tertiaryBtnText,
  tertiaryBtnDisabled,
}: RecoveryFooterButtonProps): JSX.Element {
  const tertiaryBtnDefaultOnClick = (): null => null

  return (
    <>
      <SmallButton
        buttonType="secondary"
        onClick={tertiaryBtnOnClick ?? tertiaryBtnDefaultOnClick}
        buttonText={tertiaryBtnText}
        disabled={tertiaryBtnDisabled}
        css={ODD_ONLY_BUTTON}
      />
      <SecondaryButton
        onClick={tertiaryBtnOnClick ?? tertiaryBtnDefaultOnClick}
        disabled={tertiaryBtnDisabled}
        css={DESKTOP_ONLY_BUTTON}
      >
        {tertiaryBtnText}
      </SecondaryButton>
    </>
  )
}

const PRESSED_LOADING_STATE = css`
  background-color: ${COLORS.blue60};
  &:focus {
    background-color: ${COLORS.blue60};
  }
  &:hover {
    background-color: ${COLORS.blue60};
  }
  &:focus-visible {
    background-color: ${COLORS.blue60};
  }
  &:active {
    background-color: ${COLORS.blue60};
  }
`

const ODD_ONLY_BUTTON = css`
  @media not (${RESPONSIVENESS.touchscreenMediaQuerySpecs}) {
    display: none;
  }
`

const DESKTOP_ONLY_BUTTON = css`
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    display: none;
  }
`
