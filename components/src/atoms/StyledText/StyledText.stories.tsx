/* eslint-disable storybook/prefer-pascal-case */
import { SPACING } from '../../ui-style-constants'
import { Flex } from '../../primitives'
import { StyledText, ODD_STYLES, HELIX_STYLES } from './index'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof StyledText> = {
  title: 'Helix/Atoms/StyledText',
  component: StyledText,
  argTypes: {
    oddStyle: {
      control: {
        type: 'select',
      },
      options: ODD_STYLES,
    },
    desktopStyle: {
      control: {
        type: 'select',
      },
      options: HELIX_STYLES,
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

type Story = StoryObj<typeof StyledText>

const dummyText =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Purus sapien nunc dolor, aliquet nibh placerat et nisl, arcu. Pellentesque blandit sollicitudin vitae morbi morbi vulputate cursus tellus. Amet proin donec proin id aliquet in nullam.'

export const Example: Story = {
  args: {
    oddStyle: 'level1Header',
    desktopStyle: 'displayBold',
    children: dummyText,
  },
}
