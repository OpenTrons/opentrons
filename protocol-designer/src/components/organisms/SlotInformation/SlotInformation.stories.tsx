import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { i18n } from '../../../assets/localization'
import { Flex } from '@opentrons/components'
import { SlotInformation as SlotInformationComponent } from '.'

import type { Meta, StoryObj } from '@storybook/react'

const mockLocations = [
  'A1',
  'A2',
  'A3',
  'B1',
  'B2',
  'B3',
  'C1',
  'C2',
  'C3',
  'D1',
  'D2',
  'D3',
]

const mockLiquids = ['Mastermix', 'Ethanol', 'Water']
const mockLabwares = ['96 Well Plate', 'Adapter']
const mockModules = ['Thermocycler Module Gen2', 'Heater-Shaker Module']

const meta: Meta<typeof SlotInformationComponent> = {
  title: 'Protocol-Designer/Organisms/SlotInformation',
  component: SlotInformationComponent,
  argTypes: {
    location: {
      control: {
        type: 'select',
      },
      options: mockLocations,
    },
  },
  decorators: [
    Story => (
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <Flex width="21rem">
            <Story />
          </Flex>
        </I18nextProvider>
      </MemoryRouter>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof SlotInformationComponent>

export const SlotInformation: Story = {
  args: {
    location: 'A1',
    liquids: mockLiquids,
    labwares: mockLabwares,
    modules: mockModules,
  },
}

export const SlotInformationEmpty: Story = {
  args: {
    location: 'A1',
    liquids: [],
    labwares: [],
    modules: [],
  },
}
