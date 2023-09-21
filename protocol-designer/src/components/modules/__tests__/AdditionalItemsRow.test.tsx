import * as React from 'react'
import i18n from 'i18next'
import { renderWithProviders, SlotMap } from '@opentrons/components'
import { WASTE_CHUTE_SLOT } from '@opentrons/shared-data'

import { AdditionalItemsRow } from '../AdditionalItemsRow'

jest.mock('@opentrons/components/src/slotmap/SlotMap')

const mockSlotMap = SlotMap as jest.MockedFunction<typeof SlotMap>

const render = (props: React.ComponentProps<typeof AdditionalItemsRow>) => {
  return renderWithProviders(<AdditionalItemsRow {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('AdditionalItemsRow', () => {
  let props: React.ComponentProps<typeof AdditionalItemsRow>
  beforeEach(() => {
    props = {
      handleAttachment: jest.fn(),
      isEquipmentAdded: false,
      name: 'gripper',
    }
    mockSlotMap.mockReturnValue(<div>mock slot map</div>)
  })
  it('renders no gripper', () => {
    const { getByRole, getByText } = render(props)
    getByText('Flex Gripper')
    getByRole('button', { name: 'add' }).click()
    expect(props.handleAttachment).toHaveBeenCalled()
  })
  it('renders a gripper', () => {
    props = {
      ...props,
      isEquipmentAdded: true,
    }
    const { getByRole, getByText, getByAltText } = render(props)
    getByText('Flex Gripper')
    getByAltText('Flex Gripper')
    getByText('Model:')
    getByText('GEN1')
    getByRole('button', { name: 'remove' }).click()
    expect(props.handleAttachment).toHaveBeenCalled()
  })
  it('renders no waste chute', () => {
    props = {
      ...props,
      name: 'wasteChute',
    }
    const { getByRole, getByText } = render(props)
    getByText('Waste Chute')
    getByRole('button', { name: 'add' }).click()
    expect(props.handleAttachment).toHaveBeenCalled()
  })
  it('renders a waste chute', () => {
    props = {
      ...props,
      name: 'wasteChute',
      isEquipmentAdded: true,
    }
    const { getByRole, getByText, getByAltText } = render(props)
    getByText('Waste Chute')
    getByAltText('Waste Chute')
    getByText('mock slot map')
    getByText('Position:')
    getByText(`Slot ${WASTE_CHUTE_SLOT}`)
    getByRole('button', { name: 'remove' }).click()
    expect(props.handleAttachment).toHaveBeenCalled()
  })
})
