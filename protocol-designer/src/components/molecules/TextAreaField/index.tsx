import { useEffect, useState, forwardRef } from 'react'
import styled, { css } from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  PRODUCT,
  SPACING,
  StyledText,
  TEXT_ALIGN_RIGHT,
  Tooltip,
  TYPOGRAPHY,
  useHoverTooltip,
} from '@opentrons/components'

import type {
  ChangeEventHandler,
  FocusEvent,
  MouseEvent,
  MutableRefObject,
} from 'react'
import type { FlattenSimpleInterpolation } from 'styled-components'
import type { IconName } from '@opentrons/components'

const COLOR_WARNING_DARK = '#9e5e00' // ToDo (kk:08/13/2024) replace this with COLORS

// hook to detect tab focus vs mouse focus
const useFocusVisible = (): boolean => {
  const [isKeyboardFocus, setIsKeyboardFocus] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Tab') {
        setIsKeyboardFocus(true)
      }
    }
    const handleMouseDown = (): void => {
      setIsKeyboardFocus(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  return isKeyboardFocus
}

export interface TextAreaFieldProps {
  /** field is disabled if value is true */
  disabled?: boolean
  /** change handler */
  onChange?: ChangeEventHandler<HTMLTextAreaElement>
  /** name of field in form */
  name?: string
  /** optional ID of <textarea> element */
  id?: string
  /** placeholder text */
  placeholder?: string
  /** current value of text in box, defaults to '' */
  value?: string | number | null
  /** if included, TextAreaField will use error style and display error instead of caption */
  error?: string | null
  /** optional title */
  title?: string | null
  /** optional text for tooltip */
  tooltipText?: string
  /** optional caption. hidden when `error` is given */
  caption?: string | null
  /** mouse click handler */
  onClick?: (event: MouseEvent<HTMLTextAreaElement>) => unknown
  /** focus handler */
  onFocus?: (event: FocusEvent<HTMLTextAreaElement>) => unknown
  /** blur handler */
  onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => unknown
  /** makes textarea field read-only */
  readOnly?: boolean
  /** automatically focus field on renders */
  autoFocus?: boolean
  /** if true, clear out value and add '-' placeholder */
  isIndeterminate?: boolean
  /** horizontal text alignment for title, textarea, and (sub)captions */
  textAlign?:
    | typeof TYPOGRAPHY.textAlignLeft
    | typeof TYPOGRAPHY.textAlignCenter
  /** react useRef to control textarea field instead of react event */
  ref?: MutableRefObject<HTMLTextAreaElement | null>
  /** optional IconName to display icon aligned to left of textarea field */
  leftIcon?: IconName
  /** if true, show delete icon aligned to right of textarea field */
  showDeleteIcon?: boolean
  /** callback passed to optional delete icon onClick */
  onDelete?: () => void
  /** if true, style the background of textarea field to error state */
  hasBackgroundError?: boolean
  /** optional prop to override textarea field border radius */
  borderRadius?: string
  /** optional prop to override textarea field padding */
  padding?: string
  /** optional prop to override textarea field height */
  height?: string
  /** optional prop to override textarea field resize default is none */
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextAreaFieldProps
>(
  (props, ref): JSX.Element => {
    const {
      placeholder,
      textAlign = TYPOGRAPHY.textAlignLeft,
      title,
      tooltipText,
      error,
      disabled,
      isIndeterminate,
      showDeleteIcon = false,
      hasBackgroundError = false,
      onDelete,
      borderRadius,
      padding,
      height,
      leftIcon,
      caption,
      resize = 'none',
      ...textAreaProps
    } = props

    const hasError = error != null
    const value = isIndeterminate ?? false ? '' : props.value ?? ''
    const placeHolder = isIndeterminate ?? false ? '-' : placeholder
    const [targetProps, tooltipProps] = useHoverTooltip()
    const isKeyboardFocus = useFocusVisible() // Track focus method

    return (
      <Flex
        width="100%"
        alignItems={ALIGN_CENTER}
        color={error ? COLOR_WARNING_DARK : COLORS.black90}
        opacity={disabled === true ? 0.5 : ''}
      >
        <Flex flexDirection={DIRECTION_COLUMN} width="100%">
          {title != null && (
            <Flex
              flexDirection={DIRECTION_ROW}
              gridGap={SPACING.spacing8}
              alignItems={ALIGN_CENTER}
            >
              <StyledText
                desktopStyle="bodyDefaultRegular"
                htmlFor={props.id}
                css={TITLE_STYLE(textAlign)}
              >
                {title}
              </StyledText>
              {tooltipText != null && (
                <>
                  <Flex {...targetProps}>
                    <Icon
                      name="information"
                      size={SPACING.spacing12}
                      color={COLORS.grey60}
                      data-testid="tooltip-icon"
                    />
                  </Flex>
                  <Tooltip tooltipProps={tooltipProps}>{tooltipText}</Tooltip>
                </>
              )}
            </Flex>
          )}
          <Flex
            width="100%"
            flexDirection={DIRECTION_COLUMN}
            onClick={!disabled ? props.onClick : undefined}
          >
            <Flex
              alignItems={ALIGN_CENTER}
              gridGap={leftIcon !== undefined ? SPACING.spacing8 : 0}
            >
              {leftIcon !== undefined && (
                <Flex>
                  <Icon
                    name={leftIcon}
                    color={COLORS.grey60}
                    size="1.25rem"
                    data-testid="left-icon"
                  />
                </Flex>
              )}
              <StyledTextArea
                data-testid="TextAreaField"
                hasBackgroundError={hasBackgroundError}
                hasError={hasError}
                height={height}
                padding={padding}
                borderRadius={borderRadius}
                resize={resize}
                {...textAreaProps}
                value={value}
                placeholder={placeHolder}
                onWheel={event => {
                  event.currentTarget.blur()
                }} // prevent value change with scrolling
                ref={ref}
                isKeyboardFocus={isKeyboardFocus}
                disabled={disabled}
              />
              {showDeleteIcon && (
                <Flex
                  alignSelf={TEXT_ALIGN_RIGHT}
                  onClick={onDelete}
                  cursor="pointer"
                >
                  <Icon name="close" size="1.75rem" />
                </Flex>
              )}
            </Flex>
          </Flex>
          {caption != null && (
            <StyledText
              desktopStyle="bodyDefaultRegular"
              css={FORM_BOTTOM_SPACE_STYLE}
              color={COLORS.grey60}
            >
              {caption}
            </StyledText>
          )}
          {hasError && (
            <StyledText
              desktopStyle="bodyDefaultRegular"
              css={ERROR_TEXT_STYLE}
            >
              {props.error}
            </StyledText>
          )}
        </Flex>
      </Flex>
    )
  }
)

interface StyledTextAreaProps {
  resize: 'none' | 'vertical' | 'horizontal' | 'both'
  hasBackgroundError: boolean
  hasError?: boolean
  height?: string
  padding?: string
  borderRadius?: string
  isKeyboardFocus: boolean
  disabled?: boolean
}

// Styled component with correct focus behavior
const StyledTextArea = styled.textarea<StyledTextAreaProps>`
  background-color: ${({ hasBackgroundError }) =>
    hasBackgroundError ? COLORS.red30 : COLORS.white};
  border-radius: ${({ borderRadius }) => borderRadius ?? BORDERS.borderRadius4};
  padding: ${({ padding }) => padding ?? SPACING.spacing8};
  border: ${({ hasBackgroundError, hasError }) =>
    hasBackgroundError
      ? 'none'
      : `1px ${BORDERS.styleSolid} ${
          hasError === true ? COLORS.red50 : COLORS.grey50
        }`};
  font-size: ${PRODUCT.TYPOGRAPHY.fontSizeBodyDefaultSemiBold};
  font-weight: ${TYPOGRAPHY.fontWeightRegular};
  width: 100%;
  height: ${({ height }) => height ?? '100%'};
  resize: ${({ resize }) => resize};

  &:focus {
    border: 1px ${BORDERS.styleSolid}
      ${({ hasError }) => (hasError === true ? COLORS.red50 : COLORS.blue50)};
    outline: none;
  }

  ${({ isKeyboardFocus }) =>
    isKeyboardFocus &&
    `
      &:focus {
        border: 1px ${BORDERS.styleSolid} ${COLORS.blue50};
        outline: 2px ${BORDERS.styleSolid} ${COLORS.blue50};
        outline-offset: 2px;
      }
    `}

  &:disabled {
    border: 1px ${BORDERS.styleSolid} ${COLORS.grey30};
    background-color: ${COLORS.grey20};
  }
`

const FORM_BOTTOM_SPACE_STYLE = css`
  padding-top: ${SPACING.spacing4};
`

const TITLE_STYLE = (textAlign: string): FlattenSimpleInterpolation => css`
  color: ${COLORS.grey60};
  padding-bottom: ${SPACING.spacing4};
  text-align: ${textAlign};
`

const ERROR_TEXT_STYLE = css`
  color: ${COLORS.red50};
  padding-top: ${SPACING.spacing4};
`
