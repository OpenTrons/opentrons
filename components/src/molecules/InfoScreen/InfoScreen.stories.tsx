// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react-remove-scroll'
import { Flex } from '../../primitives'
import { SPACING } from '../../ui-style-constants'
import { COLORS } from '../../helix-design-system'
import { InfoScreen as InfoScreenComponent } from './index'

import type { Meta, StoryObj } from '@storybook/react'

const mockContent = [
  'No deck hardware',
  'No labware',
  'No liquids',
  'No protocol files included',
]

const meta: Meta<typeof InfoScreenComponent> = {
  title: 'Helix/Molecules/InfoScreen',
  component: InfoScreenComponent,
  argTypes: {
    content: {
      control: {
        type: 'select',
      },
      options: mockContent,
    },
    backgroundColor: {
      control: {
        type: 'select',
      },
      options: COLORS,
    },
  },
  decorators: [
    Story => (
      <Flex padding={SPACING.spacing16}>
        <Story />
      </Flex>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof InfoScreenComponent>

export const InfoScreen: Story = {
  args: {
    content: 'No protocol files included',
  },
}
