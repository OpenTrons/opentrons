import { Flex } from '../../primitives'
import { SPACING, VIEWPORT } from '../../ui-style-constants'
import { Tag as TagComponent } from './index'
import { ICON_DATA_BY_NAME } from '../../icons/icon-data'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof TagComponent> = {
  title: 'Helix/Atoms/Tag',
  argTypes: {
    type: {
      options: ['default', 'interactive', 'branded', 'onColor'],
      control: {
        type: 'select',
      },
    },
    iconName: {
      options: Object.keys(ICON_DATA_BY_NAME),
      control: {
        type: 'select',
      },
    },
    iconPosition: {
      options: ['left', 'right'],
      control: {
        type: 'select',
      },
    },
  },
  component: TagComponent,
  parameters: VIEWPORT.touchScreenViewport,
  decorators: [
    Story => (
      <Flex padding={SPACING.spacing16} width="59rem">
        <Story />
      </Flex>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof TagComponent>

export const Tag: Story = {
  args: {
    type: 'default',
    text: 'Text',
    iconPosition: undefined,
  },
}
