import { VIEWPORT, Tag, Chip, DeckInfoLabel } from '@opentrons/components'
import { MultiDeckLabelTagBtns as MultiDeckLabelTagBtnsComponent } from '.'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'App/Molecules/MultiDeckLabelTagBtns',
  component: MultiDeckLabelTagBtnsComponent,
  argTypes: {
    numDeckInfoLabels: {
      control: { type: 'range', min: 1, max: 4, step: 1 },
      description:
        'Number of example DeckInfoLabels to include (max 3 will be displayed).',
    },
    colTwoTagText: {
      control: 'text',
      description: 'Example text to display in the example Tag component.',
    },
    hasColTwoChip: {
      control: 'boolean',
      description: 'Whether to include an example Chip component.',
    },
    colTwoChipText: {
      control: 'text',
      description: 'Example text to display in the example Chip component.',
      if: { arg: 'hasColTwoChip', eq: true },
    },
    colThreePrimaryBtnText: {
      control: 'text',
      description: 'Example text for the primary button.',
    },
    hasColThreeSecondaryBtn: {
      control: 'boolean',
      description: 'Whether to include an example secondary button.',
    },
    colThreeSecondaryBtnText: {
      control: 'text',
      description: 'Text for the example secondary button.',
      if: { arg: 'hasColThreeSecondaryBtn', eq: true },
    },
  },
  parameters: VIEWPORT.touchScreenViewport,
} as Meta

interface MultiDeckLabelTagBtnsStoryProps {
  numDeckInfoLabels: number
  colTwoTagText: string
  colTwoTagType: string
  hasColTwoChip: boolean
  colTwoChipText: string
  colThreePrimaryBtnText: string
  hasColThreeSecondaryBtn: boolean
  colThreeSecondaryBtnText: string
}

const Template: Story<MultiDeckLabelTagBtnsStoryProps> = args => {
  const {
    numDeckInfoLabels,
    colTwoTagText,
    hasColTwoChip,
    colTwoChipText,
    colThreePrimaryBtnText,
    hasColThreeSecondaryBtn,
    colThreeSecondaryBtnText,
  } = args

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

  const colTwoTag = (
    <Tag
      text={colTwoTagText}
      type="default"
      iconName="alert-circle"
      iconPosition="left"
      shrinkToContent={true}
    />
  )

  const colTwoChip = hasColTwoChip ? (
    <Chip text={colTwoChipText} type="info" hasIcon={false} />
  ) : undefined

  const colThreePrimaryBtn = {
    buttonText: colThreePrimaryBtnText,
    onClick: () => null,
  }

  const colThreeSecondaryBtn = hasColThreeSecondaryBtn
    ? {
        buttonText: colThreeSecondaryBtnText,
        onClick: () => null,
      }
    : undefined

  return (
    <MultiDeckLabelTagBtnsComponent
      colOneDeckInfoLabels={deckInfoLabels}
      colTwoTag={colTwoTag}
      colTwoChip={colTwoChip}
      colThreePrimaryBtn={colThreePrimaryBtn}
      colThreeSecondaryBtn={colThreeSecondaryBtn}
    />
  )
}

export const Default = Template.bind({})
Default.args = {
  numDeckInfoLabels: 3,
  colTwoTagText: 'Text',
  hasColTwoChip: true,
  colTwoChipText: 'Text',
  colThreePrimaryBtnText: 'Text',
  hasColThreeSecondaryBtn: true,
  colThreeSecondaryBtnText: 'Text',
}

export const WithoutChip = Template.bind({})
WithoutChip.args = {
  numDeckInfoLabels: 3,
  colTwoTagText: 'Text',
  hasColTwoChip: false,
  colThreePrimaryBtnText: 'Text',
  hasColThreeSecondaryBtn: true,
  colThreeSecondaryBtnText: 'Text',
}

export const WithoutSecondaryButton = Template.bind({})
WithoutSecondaryButton.args = {
  numDeckInfoLabels: 3,
  colTwoTagText: 'Text',
  hasColTwoChip: true,
  colTwoChipText: 'Text',
  colThreePrimaryBtnText: 'Text',
  hasColThreeSecondaryBtn: false,
}
