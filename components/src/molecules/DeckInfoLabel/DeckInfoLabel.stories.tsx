import { customViewports } from '../../../../.storybook/preview'
import { Flex } from '../../primitives'
import { SPACING } from '../../ui-style-constants'
import { DeckInfoLabel } from '.'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof DeckInfoLabel> = {
  title: 'Helix/Molecules/DeckInfoLabel',
  argTypes: {
    iconName: {
      control: {
        type: 'select',
      },
      options: [
        'ot-magnet-v2',
        'ot-heater-shaker',
        'ot-temperature-v2',
        'ot-magnet-v2',
        'ot-thermocycler',
        'ot-absorbance',
        'stacked',
      ],
    },
    deckLabel: {
      control: {
        type: 'text',
      },
      defaultValue: 'A1',
    },
  },
  component: DeckInfoLabel,
  parameters: {
    controls: { include: ['highlight', 'iconName', 'deckLabel'] },
    viewport: {
      viewports: customViewports,
      defaultViewport: 'onDeviceDisplay',
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
type Story = StoryObj<typeof DeckInfoLabel>

export const DisplaySlot: Story = {
  args: {
    deckLabel: 'A1',
    iconName: undefined,
    highlight: false,
  },
}

export const DisplayIcon: Story = {
  args: {
    deckLabel: undefined,
    iconName: 'ot-temperature-v2',
    highlight: false,
  },
}
