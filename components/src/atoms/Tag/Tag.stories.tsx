import { Flex } from '../../primitives'
import { SPACING, VIEWPORT } from '../../ui-style-constants'
import { Tag as TagComponent } from './index'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof TagComponent> = {
  title: 'Helix/Atoms/Tag',
  argTypes: {
    type: {
      options: ['default', 'interactive', 'branded'],
      control: {
        type: 'select',
      },
    },
    //  TODO(jr, 6/18/24): make iconName and iconPosition selectable when we have real examples
    //  used in the app
    iconName: {
      table: {
        disable: true,
      },
    },
    iconPosition: {
      table: {
        disable: true,
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
