import { STYLE_PROPS } from '../../primitives'
import { StyledText } from '../../atoms/StyledText'
import { Banner } from './index'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof Banner> = {
  title: 'Helix/Molecules/Banner',
  component: Banner,
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

type Story = StoryObj<typeof Banner>

export const Primary: Story = {
  args: {
    children: 'Banner component',
    type: 'success',
  },
}

export const OverriddenIcon: Story = {
  args: {
    type: 'warning',
    children: 'Banner component',
    icon: { name: 'ot-hot-to-touch' },
  },
}

export const OverriddenExitIcon: Story = {
  args: {
    type: 'informing',
    children: 'Banner component',
    onCloseClick: () => {
      console.log('close')
    },
    closeButton: (
      <StyledText desktopStyle="bodyDefaultRegular">{'Exit'}</StyledText>
    ),
  },
}
