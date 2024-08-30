import * as React from 'react'
import { I18nextProvider } from 'react-i18next'
import { i18n } from '../../assets/localization'
import { MaterialsListModal as MaterialsListModalComponent } from '.'

import type { Meta, StoryObj } from '@storybook/react'
import type { LabwareOnDeck, ModuleOnDeck } from '@opentrons/components'
import type { OrderedLiquids } from '../../labware-ingred/types'

const mockHardware = [] as ModuleOnDeck[]
const mockLabware = [] as LabwareOnDeck[]
const mockLiquids = [] as OrderedLiquids

const meta: Meta<typeof MaterialsListModalComponent> = {
  title: 'Protocol-Designer/Organisms/MaterialsListModal',
  component: MaterialsListModalComponent,
  decorators: [
    Story => (
      <I18nextProvider i18n={i18n}>
        <Story />
      </I18nextProvider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof MaterialsListModalComponent>

export const MaterialsListModal: Story = {
  args: {
    hardware: mockHardware,
    labware: mockLabware,
    liquids: mockLiquids,
  },
}
