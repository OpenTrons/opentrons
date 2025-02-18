import {
  ALIGN_CENTER,
  Btn,
  COLORS,
  Check,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  ListButton,
  SPACING,
  StyledText,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'

import type { ReactNode } from 'react'

interface CheckboxExpandStepFormFieldProps {
  title: string
  checkboxUpdateValue: (value: unknown) => void
  checkboxValue: unknown
  isChecked: boolean
  children?: ReactNode
  tooltipText?: string | null
  disabled?: boolean
}
export function CheckboxExpandStepFormField(
  props: CheckboxExpandStepFormFieldProps
): JSX.Element {
  const {
    checkboxUpdateValue,
    checkboxValue,
    children,
    isChecked,
    title,
    tooltipText,
    disabled = false,
  } = props

  const [targetProps, tooltipProps] = useHoverTooltip()
  return (
    <>
      <ListButton
        type={disabled ? 'notConnected' : 'noActive'}
        padding={SPACING.spacing12}
        onClick={() => {
          checkboxUpdateValue(!checkboxValue)
        }}
      >
        <Flex
          width="100%"
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing8}
        >
          <Flex
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            alignItems={ALIGN_CENTER}
          >
            <StyledText desktopStyle="bodyDefaultRegular" {...targetProps}>
              {title}
            </StyledText>
            <Btn disabled={disabled}>
              <Check
                color={COLORS.blue50}
                isChecked={isChecked}
                disabled={disabled}
              />
            </Btn>
          </Flex>
          {children}
        </Flex>
      </ListButton>
      {tooltipText != null ? (
        <Tooltip tooltipProps={tooltipProps}>{tooltipText}</Tooltip>
      ) : null}
    </>
  )
}
