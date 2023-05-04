import { ODDBackButton } from '.'
import type { Story, Meta } from '@storybook/react'
import * as React from 'react'

export default {
  title: 'ODD/Molecules/ODDBackButton',
  argTypes: {
    onClick: { action: 'clicked' },
  },
} as Meta

const ODDBackButtonTemplate: Story<
  React.ComponentProps<typeof ODDBackButton>
> = args => <ODDBackButton {...args} />
export const ODDBackButtonComponent = ODDBackButtonTemplate.bind({})
ODDBackButtonComponent.args = {
  label: 'Previous location',
}
