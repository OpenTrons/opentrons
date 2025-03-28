import { VIEWPORT, Tag, DeckInfoLabel } from '@opentrons/components'

import { DeckInfoLabelTextTag as DeckInfoLabelTextTagComponent } from '.'

import type { Story, Meta } from '@storybook/react'

export default {
  title: 'App/Molecules/DeckInfoLabelTextTag',
  component: DeckInfoLabelTextTagComponent,
  argTypes: {
    numDeckInfoLabels: {
      control: { type: 'range', min: 1, max: 4, step: 1 },
      description:
        'Number of DeckInfoLabels to include (max 3 will be displayed)',
    },
    colTwoText: {
      control: 'text',
      description: 'Text to display in the middle column',
    },
    tagText: {
      control: 'text',
      description: 'Sample text to display in the example child component.',
    },
  },
  parameters: VIEWPORT.touchScreenViewport,
} as Meta

interface DeckInfoLabelTextTagStoryProps {
  numDeckInfoLabels: number
  colTwoText: string
  tagText: string
}

const Template: Story<DeckInfoLabelTextTagStoryProps> = args => {
  const { numDeckInfoLabels, colTwoText, tagText } = args

  const deckInfoLabels = []
  for (let i = 0; i < numDeckInfoLabels; i++) {
    deckInfoLabels.push(
      <DeckInfoLabel
        key={`deck-label-${i}`}
        highlight={i === 1}
        iconName={
          i === 0 ? 'stacked' : i === 1 ? 'ot-heater-shaker' : 'ot-absorbance'
        }
      />
    )
  }

  const colThreeTag = (
    <Tag
      text={tagText}
      type="default"
      iconName="alert-circle"
      iconPosition="left"
      shrinkToContent={true}
    />
  )

  return (
    <DeckInfoLabelTextTagComponent
      colOneDeckInfoLabels={deckInfoLabels}
      colTwoText={colTwoText}
      colThreeTag={colThreeTag}
    />
  )
}

export const DeckInfoLabelTextTag = Template.bind({})
DeckInfoLabelTextTag.args = {
  numDeckInfoLabels: 3,
  colTwoText: 'Example Text',
  tagText: 'Example Tag',
}
