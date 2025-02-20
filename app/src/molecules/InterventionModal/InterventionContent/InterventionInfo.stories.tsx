import { Box, ICON_DATA_BY_NAME } from '@opentrons/components'

import { InterventionInfo } from './InterventionInfo'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof InterventionInfo> = {
  title: 'App/Molecules/InterventionModal/InterventionContent/InterventionInfo',
  component: InterventionInfo,
  argTypes: {
    type: {
      control: {
        type: 'select',
      },
      options: [
        'location',
        'location-arrow-location',
        'location-colon-location',
      ],
    },
    labwareName: {
      control: 'text',
    },
    currentLocationProps: {
      control: {
        type: 'object',
      },
      slotName: {
        control: 'text',
      },
      iconName: {
        control: {
          type: 'select',
        },
        options: Object.keys(ICON_DATA_BY_NAME),
      },
    },
    newLocationProps: {
      control: {
        type: 'object',
      },
      slotName: {
        control: 'text',
      },
      iconName: {
        control: {
          type: 'select',
        },
        options: Object.keys(ICON_DATA_BY_NAME),
      },
    },
    labwareNickname: {
      control: {
        type: 'text',
      },
    },
  },
  decorators: [
    Story => (
      <Box width="27rem">
        <Story />
      </Box>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof InterventionInfo>

export const MoveBetweenSlots: Story = {
  args: {
    layout: 'default',
    type: 'location-arrow-location',
    labwareName: 'Plate',
    currentLocationProps: {
      deckLabel: 'A1',
    },
    newLocationProps: {
      deckLabel: 'B2',
    },
  },
}

export const Refill: Story = {
  args: {
    layout: 'default',
    type: 'location',
    labwareName: 'Tip Rack',
    currentLocationProps: {
      deckLabel: 'A1',
    },
  },
}

export const Select: Story = {
  args: {
    layout: 'default',
    type: 'location-colon-location',
    labwareName: 'Well',
    currentLocationProps: {
      deckLabel: 'A1',
    },
    newLocationProps: {
      deckLabel: 'B1',
    },
  },
}

export const LabwareWithLidAndQuantity: Story = {
  args: {
    layout: 'stacked',
    type: 'location',
    labwareName: 'Labware with lid',
    subText: 'With Tip Rack Lid',
    tagText: 'Quantity: 3',
    currentLocationProps: {
      deckLabel: 'STACKER A',
    },
    newLocationProps: {
      deckLabel: 'OFF-DECK',
    },
  },
}
