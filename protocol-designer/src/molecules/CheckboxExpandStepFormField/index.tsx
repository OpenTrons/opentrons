import * as React from 'react'
import {
  ALIGN_CENTER,
  Btn,
  COLORS,
  Check,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  ListItem,
  SPACING,
  StyledText,
} from '@opentrons/components'

interface CheckboxExpandStepFormField {
  title: string
  checkboxUpdateValue: (value: unknown) => void
  checkboxValue: unknown
  isChecked: boolean
  children: React.ReactNode
}
export function CheckboxExpandStepFormField(
  props: CheckboxExpandStepFormField
): JSX.Element {
  const {
    checkboxUpdateValue,
    checkboxValue,
    children,
    isChecked,
    title,
  } = props
  return (
    <ListItem type="noActive">
      <Flex
        padding={SPACING.spacing12}
        width="100%"
        flexDirection={DIRECTION_COLUMN}
      >
        <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} alignItems={ALIGN_CENTER}>
          <StyledText desktopStyle="bodyDefaultRegular">{title}</StyledText>
          <Btn
            onClick={() => {
              checkboxUpdateValue(!checkboxValue)
            }}
          >
            <Check color={COLORS.blue50} isChecked={isChecked} />
          </Btn>
        </Flex>
        {children}
      </Flex>
    </ListItem>
  )
}
