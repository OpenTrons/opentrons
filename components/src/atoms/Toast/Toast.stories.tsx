import * as React from 'react'

import { Toast } from './index'
import { Flex, STYLE_PROPS } from '../../primitives'
import { DIRECTION_COLUMN, DIRECTION_ROW } from '../../styles'
import { SPACING } from '../../ui-style-constants'
import { PrimaryButton } from '../buttons'
import { LegacyStyledText } from '../StyledText'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'Helix/Atoms/Toast',
  component: Toast,
  argTypes: {
    // Disable all StyleProps
    ...Object.fromEntries(
      [...STYLE_PROPS, 'as', 'ref', 'theme', 'forwardedAs'].map(prop => [
        prop,
        { table: { disable: true } },
      ])
    ),
  },
} as Meta

const TemplateWithTimeout: Story<React.ComponentProps<typeof Toast>> = args => {
  const [isShowToast, setIsShowToast] = React.useState<boolean>(false)

  const handleClick = (): void => {
    setIsShowToast(true)
  }

  return (
    <>
      <Flex flexDirection={DIRECTION_ROW} marginY={SPACING.spacing16}>
        <PrimaryButton onClick={handleClick}>Click me</PrimaryButton>
        <Flex flexDirection={DIRECTION_COLUMN} marginLeft={SPACING.spacing8}>
          <LegacyStyledText as="p">
            When clicking the button, the Toast shows up below.
          </LegacyStyledText>
          <LegacyStyledText as="p">
            Unless you set a duration or disable the timeout, the Toast will
            disappear between 2 and 7 seconds depending on the length of the
            text.
          </LegacyStyledText>
        </Flex>
      </Flex>
      {isShowToast && (
        <Toast
          {...args}
          onClose={() => {
            setIsShowToast(false)
          }}
        />
      )}
    </>
  )
}

export const ToastComponent = TemplateWithTimeout.bind({})
ToastComponent.args = {
  message: 'Success Toast message',
  type: 'success',
  displayType: 'desktop',
}
