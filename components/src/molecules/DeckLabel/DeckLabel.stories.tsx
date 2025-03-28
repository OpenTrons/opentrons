import { DeckLabel as DeckLabelComponent } from '.'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof DeckLabelComponent> = {
  title: 'Helix/Molecules/DeckLabel',
  component: DeckLabelComponent,
  argTypes: {
    isSelected: {
      control: {
        type: 'boolean',
      },
    },
    isLast: {
      control: {
        type: 'boolean',
      },
    },
  },
}
export default meta

type Story = StoryObj<typeof DeckLabelComponent>

export const DeckLabel: Story = {
  args: {
    text: 'Label',
    isSelected: false,
    isLast: true,
  },
}
