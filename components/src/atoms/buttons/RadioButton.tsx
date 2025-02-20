import styled, { css } from 'styled-components'
import { Flex } from '../../primitives'
import { COLORS, BORDERS } from '../../helix-design-system'
import { RESPONSIVENESS, SPACING } from '../../ui-style-constants'
import {
  ALIGN_CENTER,
  CURSOR_DEFAULT,
  CURSOR_NOT_ALLOWED,
  CURSOR_POINTER,
  DIRECTION_ROW,
  Icon,
  StyledText,
} from '../../index'

import type { ChangeEventHandler, ReactNode } from 'react'
import type { FlattenSimpleInterpolation } from 'styled-components'
import type { IconName } from '../../icons'
import type { StyleProps } from '../../primitives'

interface RadioButtonProps extends StyleProps {
  buttonLabel: string | ReactNode
  buttonValue: string | number
  onChange: ChangeEventHandler<HTMLInputElement>
  disabled?: boolean
  iconName?: IconName
  isSelected?: boolean
  largeDesktopBorderRadius?: boolean
  radioButtonType?: 'large' | 'small'
  subButtonLabel?: string
  id?: string
  maxLines?: number
  //  used for mouseEnter and mouseLeave
  setNoHover?: () => void
  setHovered?: () => void
  // TODO wire up the error state for the radio button
  error?: string | null
}

// used for ODD and helix
export function RadioButton(props: RadioButtonProps): JSX.Element {
  const {
    buttonLabel,
    buttonValue,
    onChange,
    disabled = false,
    iconName,
    isSelected = false,
    largeDesktopBorderRadius = false,
    radioButtonType = 'large',
    subButtonLabel,
    id = typeof buttonLabel === 'string'
      ? buttonLabel
      : `RadioButtonId_${buttonValue}`,
    maxLines = 1,
    setHovered,
    setNoHover,
  } = props
  const isLarge = radioButtonType === 'large'

  const AVAILABLE_BUTTON_STYLE = css`
    background: ${COLORS.blue35};

    &:hover,
    &:active {
      background-color: ${disabled ? COLORS.grey35 : COLORS.blue40};
    }
  `

  const SELECTED_BUTTON_STYLE = css`
    background: ${COLORS.blue50};
    color: ${COLORS.white};

    &:active {
      background-color: ${disabled ? COLORS.grey35 : COLORS.blue60};
    }
  `

  const SUBBUTTON_LABEL_STYLE = css`
    color: ${disabled
      ? COLORS.grey50
      : isSelected
      ? COLORS.white
      : COLORS.grey60};
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  `

  const getButtonStyle = (
    isSelected: boolean,
    disabled: boolean
  ): FlattenSimpleInterpolation => {
    if (disabled) return DISABLED_BUTTON_STYLE
    if (isSelected) return SELECTED_BUTTON_STYLE
    return AVAILABLE_BUTTON_STYLE
  }

  return (
    <RadioButtonWrapper>
      <SettingButton
        checked={isSelected}
        disabled={disabled}
        id={id}
        onChange={onChange}
        type="radio"
        value={buttonValue}
      />
      <SettingButtonLabel
        tabIndex={0}
        isLarge={isLarge}
        maxLines={maxLines}
        largeDesktopBorderRadius={largeDesktopBorderRadius}
        disabled={disabled}
        isSelected={isSelected}
        role="label"
        htmlFor={id}
        onMouseEnter={setHovered}
        onMouseLeave={setNoHover}
        css={getButtonStyle(isSelected, disabled)}
        aria-selected={isSelected}
      >
        <Flex
          flexDirection={DIRECTION_ROW}
          gridGap={SPACING.spacing2}
          alignItems={ALIGN_CENTER}
        >
          {iconName != null ? (
            <Icon
              name={iconName}
              size="1rem"
              data-testid={`icon_${iconName}`}
            />
          ) : null}
          {typeof buttonLabel === 'string' ? (
            <StyledText
              oddStyle={isLarge ? 'level4HeaderSemiBold' : 'bodyTextRegular'}
              desktopStyle={
                isLarge ? 'bodyDefaultSemiBold' : 'bodyDefaultRegular'
              }
            >
              {buttonLabel}
            </StyledText>
          ) : (
            buttonLabel
          )}
        </Flex>
        {subButtonLabel != null ? (
          <Flex css={SUBBUTTON_LABEL_STYLE}>
            <StyledText
              oddStyle={isLarge ? 'level4HeaderRegular' : 'bodyTextRegular'}
              desktopStyle="bodyDefaultRegular"
            >
              {subButtonLabel}
            </StyledText>
          </Flex>
        ) : null}
      </SettingButtonLabel>
    </RadioButtonWrapper>
  )
}

const DISABLED_BUTTON_STYLE = css`
  background-color: ${COLORS.grey35};
  color: ${COLORS.grey50};

  &:hover,
  &:active {
    background-color: ${COLORS.grey35};
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    cursor: ${CURSOR_NOT_ALLOWED};
  }
`

interface RadioButtonWrapperProps {
  width?: string
}

const RadioButtonWrapper = styled(Flex)<RadioButtonWrapperProps>`
  width: ${({ width }) => width ?? 'auto'};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    width: 100%;
  }
`

const SettingButton = styled.input`
  display: none;
`

interface SettingsButtonLabelProps {
  isSelected: boolean
  disabled: boolean
  largeDesktopBorderRadius: boolean
  isLarge: boolean
  maxLines?: number | null
}

const SettingButtonLabel = styled.label<SettingsButtonLabelProps>`
  border-radius: ${({ largeDesktopBorderRadius }) =>
    !largeDesktopBorderRadius ? BORDERS.borderRadius40 : BORDERS.borderRadius8};
  cursor: ${CURSOR_POINTER};
  padding: ${SPACING.spacing12} ${SPACING.spacing16};
  width: 100%;

  ${({ disabled }) => disabled && DISABLED_BUTTON_STYLE}

  /* note this is to disable the black outline that is the browser’s default focus ring  */
  &:focus {
    outline: none;
  }
  &:focus-visible:not([aria-selected='true']) {
    /* outline: 2px solid ${COLORS.blue55}; */
    color: ${COLORS.blue55};
    outline: 2px solid ${COLORS.blue55};
    outline-offset: 0.12rem;
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    cursor: ${CURSOR_DEFAULT};
    padding: ${({ largeDesktopBorderRadius }) =>
      largeDesktopBorderRadius ? SPACING.spacing24 : SPACING.spacing20};
    border-radius: ${BORDERS.borderRadius16};
    display: ${({ maxLines }) => (maxLines != null ? '-webkit-box' : 'none')};
    -webkit-line-clamp: ${({ maxLines }) => maxLines ?? 'none'};
    -webkit-box-orient: ${({ maxLines }) =>
      maxLines != null ? 'vertical' : 'none'};
    word-wrap: break-word;
    word-break: break-all;
  }
`
