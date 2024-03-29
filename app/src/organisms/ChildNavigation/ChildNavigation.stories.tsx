import * as React from 'react'
import { VIEWPORT } from '@opentrons/components'
import { SmallButton } from '../../atoms/buttons'
import { ChildNavigation } from '.'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'ODD/Organisms/ChildNavigation',
  parameters: VIEWPORT.touchScreenViewport,
} as Meta

const Template: Story<React.ComponentProps<typeof ChildNavigation>> = args => (
  <ChildNavigation {...args} />
)
export const Default = Template.bind({})
Default.args = {
  header: 'Header',
}

export const TitleWithNormalSmallButton = Template.bind({})
TitleWithNormalSmallButton.args = {
  header: 'Header',
  buttonText: 'ButtonText',
  onClickButton: () => {},
}

export const TitleWithLinkButton = Template.bind({})
TitleWithLinkButton.args = {
  header: 'Header',
  buttonText: 'Setup Instructions',
  buttonType: 'tertiaryLowLight',
  iconName: 'information',
  iconPlacement: 'startIcon',
  onClickButton: () => {},
}

export const TitleWithTwoButtons = Template.bind({})
const secondaryButtonProps: React.ComponentProps<typeof SmallButton> = {
  onClick: () => {},
  buttonText: 'Setup Instructions',
  buttonType: 'tertiaryLowLight',
  iconName: 'information',
  iconPlacement: 'startIcon',
}
TitleWithTwoButtons.args = {
  header: 'Header',
  buttonText: 'ButtonText',
  onClickButton: () => {},
  secondaryButtonProps,
}
