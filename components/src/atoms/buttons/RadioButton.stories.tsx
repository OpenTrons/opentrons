import { action } from '@storybook/addon-actions'

import { VIEWPORT } from '../../ui-style-constants'
import { RadioButton as RadioButtonComponent } from './RadioButton'
import { ICON_DATA_BY_NAME } from '../../icons/icon-data'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof RadioButtonComponent> = {
  title: 'Helix/Atoms/Buttons/RadioButton',
  component: RadioButtonComponent,
  argTypes: {
    radioButtonType: {
      control: {
        type: 'select',
        options: ['large', 'small'],
      },
      defaultValue: 'large',
    },
    buttonSubLabel: {
      control: 'object',
      description:
        'Optional subtext configuration object with text and alignment.',
      table: {
        type: {
          summary: 'RadioButtonSubLabel',
          detail:
            '{ buttonSubLabel: string, align?: "horizontal" | "vertical" }',
        },
      },
    },
    iconName: {
      options: Object.keys(ICON_DATA_BY_NAME),
      control: {
        type: 'select',
      },
    },
  },

  parameters: VIEWPORT.touchScreenViewport,
  args: {
    onChange: action('on-change'),
  },
}
export default meta

type Story = StoryObj<typeof RadioButtonComponent>

export const RadioButton: Story = {
  args: {
    buttonLabel: 'Button text',
    buttonValue: 1,
    disabled: false,
    isSelected: false,
  },
  name: 'Basic RadioButton',
}

export const RadioButtonWithHorizontalSubLabel: Story = {
  args: {
    buttonLabel: 'Button text',
    buttonValue: 2,
    disabled: false,
    isSelected: false,
    radioButtonType: 'large',
    buttonSubLabel: {
      label: 'Horizontal subtext',
      align: 'horizontal',
    },
  },
  name: 'With Horizontal Subtext',
}

export const RadioButtonWithVerticalSubLabel: Story = {
  args: {
    buttonLabel: 'Button text',
    buttonValue: 3,
    disabled: false,
    isSelected: false,
    radioButtonType: 'large',
    buttonSubLabel: {
      label: 'Vertical subtext',
      align: 'vertical',
    },
  },
  name: 'With Vertical Subtext',
}

export const RadioButtonWithIcon: Story = {
  args: {
    buttonLabel: 'Button text',
    buttonValue: 1,
    disabled: false,
    isSelected: false,
    iconName: 'stacked',
  },
  name: 'RadioButton with Icon',
}

export const RadioButtonWithTag: Story = {
  args: {
    buttonLabel: 'Button text',
    buttonValue: 1,
    disabled: false,
    isSelected: false,
    tagText: '1',
  },
  name: 'RadioButton with Tag',
}
