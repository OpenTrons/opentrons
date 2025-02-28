import { Tag } from '@opentrons/components'
import { HeadlineTagBtn as HeadlineTagBtnComponent } from '.'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'Library/Molecules/HeadlineTagBtn',
  component: HeadlineTagBtnComponent,
  argTypes: {
    headline: {
      control: 'text',
      description: 'Headline text to display.',
    },
    buttonText: {
      control: 'text',
      description: 'Button text to display.',
    },
    hasTag: {
      control: 'boolean',
      description: 'Whether to include an example Tag component.',
    },
    tagText: {
      control: 'text',
      description: 'Text to display in the example Tag component.',
      if: { arg: 'hasTag', eq: true },
    },
  },
} as Meta

interface HeadlineTagBtnStoryProps {
  headline: string
  buttonText: string
  hasTag: boolean
  tagText: string
}

const Template: Story<HeadlineTagBtnStoryProps> = args => {
  const { headline, buttonText, hasTag, tagText } = args

  const tag = hasTag ? (
    <Tag
      text={tagText}
      type="default"
      iconName="alert-circle"
      iconPosition="left"
      shrinkToContent={true}
    />
  ) : undefined

  return (
    <HeadlineTagBtnComponent
      headline={headline}
      buttonText={buttonText}
      tag={tag}
      isOnDevice={false}
      onClick={() => null}
    />
  )
}

const OnDeviceTemplate: Story<HeadlineTagBtnStoryProps> = args => {
  const { headline, buttonText, hasTag, tagText } = args

  const tag = hasTag ? (
    <Tag
      text={tagText}
      type="default"
      shrinkToContent={true}
      iconName="alert-circle"
      iconPosition="left"
    />
  ) : undefined

  return (
    <HeadlineTagBtnComponent
      headline={headline}
      buttonText={buttonText}
      tag={tag}
      isOnDevice={true}
      onClick={() => null}
    />
  )
}

export const HeadlineTagBtn = Template.bind({})
HeadlineTagBtn.args = {
  headline: 'Example Headline',
  buttonText: 'Sample Text',
  hasTag: true,
  tagText: 'Sample Tag',
  tagType: 'default',
  tagIcon: true,
}

export const WithoutTag = Template.bind({})
WithoutTag.args = {
  headline: 'Example Headline',
  buttonText: 'Sample Text',
  hasTag: false,
}

export const OnDeviceDisplay = OnDeviceTemplate.bind({})
OnDeviceDisplay.args = {
  headline: 'Example Headline',
  buttonText: 'Sample Text',
  hasTag: true,
  tagText: 'Sample Tag',
  tagType: 'interactive',
  tagIcon: true,
}
OnDeviceDisplay.parameters = {
  viewport: {
    defaultViewport: 'responsive',
    viewports: {
      responsive: {
        name: 'OnDeviceDisplay',
        styles: {
          width: '1024px',
          height: '600px',
        },
      },
    },
  },
}
