import * as React from 'react'
import { MediumButtonRounded, SmallButton } from '.'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'ODD/Atoms/Buttons',
  argTypes: { onClick: { action: 'clicked' } },
} as Meta

const MediumButtonRoundedTemplate: Story<
  React.ComponentProps<typeof MediumButtonRounded>
> = args => <MediumButtonRounded {...args} />
export const MediumRounded = MediumButtonRoundedTemplate.bind({})
MediumRounded.args = {
  children: 'Button text',
  title: 'medium button rounded',
}

const SmallButtonTemplate: Story<
  React.ComponentProps<typeof SmallButton>
> = args => <SmallButton {...args} />
export const Small = SmallButtonTemplate.bind({})
Small.args = {
  children: 'Button text',
  title: 'small button',
}
