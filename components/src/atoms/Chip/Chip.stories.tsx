import { Flex } from '../../primitives'
import { COLORS } from '../../helix-design-system'
import { SPACING, VIEWPORT } from '../../ui-style-constants'
import { Chip as ChipComponent } from '.'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof ChipComponent> = {
  title: 'Helix/Atoms/Chip',
  argTypes: {
    type: {
      options: ['error', 'info', 'neutral', 'success', 'warning'],
      control: {
        type: 'select',
      },
    },
    hasIcon: {
      control: {
        type: 'boolean',
      },
    },
    chipSize: {
      options: ['medium', 'small'],
      control: {
        type: 'select',
      },
    },
    iconName: {
      options: ['connection-status', 'ot-check', 'ot-alert'],
      control: {
        type: 'select',
      },
    },
  },
  component: ChipComponent,
  parameters: VIEWPORT.touchScreenViewport,
  decorators: [
    Story => (
      <Flex
        padding={SPACING.spacing16}
        backgroundColor={COLORS.grey50}
        width="59rem"
      >
        <Story />
      </Flex>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ChipComponent>

export const Chip: Story = {
  args: {
    type: 'success',
    text: 'Chip component',
    hasIcon: true,
    chipSize: 'medium',
  },
}
