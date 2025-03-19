import { Flex } from '../../primitives'
import { SPACING } from '../../ui-style-constants'
import { customViewports } from '../../../../.storybook/preview'
import { LiquidIcon } from '.'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof LiquidIcon> = {
  title: 'Helix/Molecules/LiquidIcon',
  argTypes: {
    color: {
      control: {
        type: 'text',
      },
    },
    size: {
      control: {
        type: 'select',
      },
      options: ['small', 'medium'],
    },
  },
  component: LiquidIcon,
  parameters: {
    viewport: {
      viewports: customViewports,
      defaultViewport: 'desktopSmall',
    },
  },
  decorators: [
    Story => (
      <Flex padding={SPACING.spacing16} width="15rem" height="5rem">
        <Story />
      </Flex>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof LiquidIcon>

export const MediumIcon: Story = {
  args: {
    size: 'medium',
    color: 'green',
    onClick: () => {},
  },
}

export const SmallIcon: Story = {
  args: {
    color: 'red',
    size: 'small',
  },
}
