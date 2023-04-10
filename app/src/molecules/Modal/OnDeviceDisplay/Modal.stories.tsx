import * as React from 'react'
import { COLORS, Flex } from '@opentrons/components'
import { Modal } from './Modal'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'ODD/Molecules/Modals/Modal',
  argTypes: {
    modalSize: {
      options: ['small', 'medium', 'large'],
      control: { type: 'radio' },
    },
    onOutsideClick: { action: 'clicked' },
  },
} as Meta

const Template: Story<React.ComponentProps<typeof Modal>> = args => (
  <Modal {...args} />
)
export const Default = Template.bind({})
Default.args = {
  modalSize: 'medium',
  header: {
    title: 'Header',
    hasExitIcon: true,
    iconName: 'information',
    iconColor: COLORS.black,
  },
  children: <Flex>children goes here</Flex>,
}
