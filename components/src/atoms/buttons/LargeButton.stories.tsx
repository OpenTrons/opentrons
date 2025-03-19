import { ICON_DATA_BY_NAME } from '../../icons'
import { SPACING } from '../../ui-style-constants'
import { Box, STYLE_PROPS } from '../../primitives'
import { COLORS } from '../../helix-design-system'
import { LargeButton } from './LargeButton'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof LargeButton> = {
  title: 'Helix/Atoms/Buttons/LargeButton',
  component: LargeButton,
  argTypes: {
    // Disable all StyleProps
    ...Object.fromEntries(
      [...STYLE_PROPS, 'as', 'ref', 'theme', 'forwardedAs'].map(prop => [
        prop,
        { table: { disable: true } },
      ])
    ),
    onClick: { action: 'clicked' },
    iconName: {
      control: {
        type: 'select',
      },
      options: Object.keys(ICON_DATA_BY_NAME),
    },
  },
  parameters: {
    viewport: {
      defaultViewport: 'Touchscreen',
    },
    pseudo: {
      rootSelector: '#content',
    },
  },
  decorators: [
    (Story, context) => (
      <Box
        width={'fit-content'}
        padding={SPACING.spacing32}
        backgroundColor={
          ['alertStroke', 'alertAlt'].includes(context.args.buttonType)
            ? COLORS.black90
            : COLORS.white
        }
      >
        <Story id={'content'} />
      </Box>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof LargeButton>

export const Primary: Story = {
  args: {
    buttonText: 'Button text',
    disabled: false,
    iconName: 'play-round-corners',
  },
}
export const Secondary: Story = {
  args: {
    buttonText: 'Button text',
    buttonType: 'secondary',
    disabled: false,
    iconName: 'build',
  },
}
export const Alert: Story = {
  args: {
    buttonText: 'Button text',
    buttonType: 'alert',
    disabled: false,
    iconName: 'reset',
  },
}

export const AlertStroke: Story = {
  args: {
    buttonType: 'alertStroke',
    buttonText: 'Button text',
    disabled: false,
    iconName: 'ot-alert',
  },
}

export const AlertAlt: Story = {
  args: {
    buttonType: 'alertAlt',
    buttonText: 'Button text',
    disabled: false,
    iconName: 'ot-check',
  },
}

export const Stroke: Story = {
  args: {
    buttonType: 'stroke',
    buttonText: 'Button text',
    disabled: false,
    iconName: 'ot-check',
  },
}
