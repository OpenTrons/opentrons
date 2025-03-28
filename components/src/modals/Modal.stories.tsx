import { PrimaryButton, StyledText } from '../atoms'
import { SPACING } from '../ui-style-constants'
import { Flex, STYLE_PROPS } from '../primitives'
import { JUSTIFY_END } from '../styles'
import { Modal as ModalComponent } from './Modal'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof ModalComponent> = {
  title: 'Helix/Molecules/Modal',
  component: ModalComponent,
  argTypes: {
    // Disable all StyleProps
    ...Object.fromEntries(
      [...STYLE_PROPS, 'as', 'ref', 'theme', 'forwardedAs'].map(prop => [
        prop,
        { table: { disable: true } },
      ])
    ),
  },
}
export default meta
type Story = StoryObj<typeof ModalComponent>
const bodyText = 'Modal body goes here'

const Children = (
  <StyledText desktopStyle="bodyDefaultRegular">{bodyText}</StyledText>
)

const Footer = (
  <Flex justifyContent={JUSTIFY_END} padding={SPACING.spacing24}>
    <PrimaryButton onClick={() => {}}>{'btn text'}</PrimaryButton>
  </Flex>
)

export const Modal: Story = {
  args: {
    type: 'info',
    onClose: () => {},
    closeOnOutsideClick: false,
    title: 'Modal Title',
    children: Children,
    footer: Footer,
  },
}
