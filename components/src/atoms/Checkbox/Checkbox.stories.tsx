import { Checkbox } from './index'

import type { StoryObj, Meta } from '@storybook/react'

const meta: Meta<typeof Checkbox> = {
  title: 'Helix/Atoms/Checkbox',
  component: Checkbox,
}

type Story = StoryObj<typeof Checkbox>

export const Basic: Story = {
  args: {
    isChecked: true,
    labelText: 'Button Text',
    onClick: () => {
      console.log('clicked')
    },
    tabIndex: 1,
    disabled: false,
  },
}

export default meta
