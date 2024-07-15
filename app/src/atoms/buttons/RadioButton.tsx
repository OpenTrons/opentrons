import * as React from 'react'
import styled, { css } from 'styled-components'
import {
  BORDERS,
  COLORS,
  Flex,
  RESPONSIVENESS,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import type { StyleProps } from '@opentrons/components'

interface RadioButtonProps extends StyleProps {
  buttonLabel: string
  buttonValue: string | number
  onChange: React.ChangeEventHandler<HTMLInputElement>
  disabled?: boolean
  isSelected?: boolean
  radioButtonType?: 'large' | 'small'
  subButtonLabel?: string
}

export function RadioButton(props: RadioButtonProps): JSX.Element {
  const {
    buttonLabel,
    buttonValue,
    disabled = false,
    isSelected = false,
    onChange,
    radioButtonType = 'large',
    subButtonLabel,
  } = props

  const isLarge = radioButtonType === 'large'

  const SettingButton = styled.input`
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      display: none;
}
  `

  const AVAILABLE_BUTTON_STYLE = css`
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {

    background: ${COLORS.blue35};

    &:active {
      background-color: ${COLORS.blue40};
    }
}
  `

  const SELECTED_BUTTON_STYLE = css`
      @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {

    background: ${COLORS.blue50};
    color: ${COLORS.white};

    &:active {
      background-color: ${COLORS.blue60};
    }
}
  `

  const DISABLED_BUTTON_STYLE = css`
    background-color: ${COLORS.grey35};
    color: ${COLORS.grey50};
    cursor: not-allowed;
  `

  // TODO: (ew, 2023-04-21): button is not tabbable, so focus state
  // is not possible on ODD. It's testable in storybook but not in real life.
  const SettingButtonLabel = styled.label`
    padding: 4px;
    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    border-radius: ${BORDERS.borderRadius16};
    cursor: pointer;
    padding: ${isLarge ? SPACING.spacing24 : SPACING.spacing20};
    width: 100%;

    ${isSelected ? SELECTED_BUTTON_STYLE : AVAILABLE_BUTTON_STYLE}
    ${disabled && DISABLED_BUTTON_STYLE}

    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      cursor: default;
    }
}
  `

const DesktopLabelStyle = css`
    font-size: ${TYPOGRAPHY.fontSize14};
    font-weight: 400;
    line-height: 20px;
`

  return (
    <Flex width="100%">
      <SettingButton
        checked={isSelected}
        disabled={disabled}
        id={buttonLabel}
        onChange={onChange}
        type="radio"
        value={buttonValue}
      />
      <SettingButtonLabel role="label" htmlFor={buttonLabel}>
        <LegacyStyledText
          oddStyle={isLarge? "level4HeaderRegular" : "bodyTextRegular"}
          desktopStyle="bodyDefaultRegular"
        >
          {buttonLabel}
        </LegacyStyledText>
        {subButtonLabel != null ? (
          <LegacyStyledText as="h4" fontWeight={TYPOGRAPHY.fontWeightRegular}>
            {subButtonLabel}
          </LegacyStyledText>
        ) : null}
      </SettingButtonLabel>
    </Flex>
  )
}
