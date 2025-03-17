import * as React from 'react'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_CENTER,
  PrimaryButton,
  SPACING,
  LegacyStyledText,
  VIEWPORT,
} from '@opentrons/components'

import { Snackbar } from './index'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'Helix/Atoms/Snackbar',
  component: Snackbar,
  parameters: VIEWPORT.touchScreenViewport,
} as Meta

const DefaultTemplate: Story<React.ComponentProps<typeof Snackbar>> = args => {
  const [isShowSnackbar, setIsShowSnackbar] = React.useState<boolean>(false)

  const handleClick = (): void => {
    setIsShowSnackbar(true)
  }

  return (
    <>
      <Flex flexDirection={DIRECTION_ROW} marginY={SPACING.spacing16}>
        <PrimaryButton onClick={handleClick}>Click me</PrimaryButton>
        <Flex flexDirection={DIRECTION_COLUMN} marginLeft={SPACING.spacing8}>
          <LegacyStyledText as="p">
            When clicking the button, the Snackbar shows up in the bottom.
          </LegacyStyledText>
          <LegacyStyledText as="p">
            By default the Snackbar will disappear after 4 seconds.
          </LegacyStyledText>
        </Flex>
      </Flex>
      {isShowSnackbar && (
        <Flex
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_CENTER}
          width="100%"
          position="absolute"
          bottom={SPACING.spacing40}
          zIndex={1000}
        >
          <Snackbar
            {...args}
            onClose={() => {
              setIsShowSnackbar(false)
            }}
          />
        </Flex>
      )}
    </>
  )
}

export const SnackbarComponent = DefaultTemplate.bind({})
SnackbarComponent.args = {
  message: 'Short and sweet message',
}
