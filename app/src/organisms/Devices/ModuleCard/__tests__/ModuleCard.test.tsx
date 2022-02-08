import * as React from 'react'
import { resetAllWhenMocks } from 'jest-when'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@opentrons/components'
import { i18n } from '../../../../i18n'
import { MagneticModuleData } from '../MagneticModuleData'
import { TemperatureModuleData } from '../TemperatureModuleData'
import { ThermocyclerModuleData } from '../ThermocyclerModuleData'
import { ModuleCard } from '..'
import {
  mockMagneticModule,
  mockTemperatureModuleGen2,
  mockThermocycler,
} from '../../../../redux/modules/__fixtures__'

import type { MagneticModule } from '../../../../redux/modules/types'

jest.mock('../MagneticModuleData')
jest.mock('../TemperatureModuleData')
jest.mock('../ThermocyclerModuleData')

const mockMagneticModuleData = MagneticModuleData as jest.MockedFunction<
  typeof MagneticModuleData
>
const mockTemperatureModuleData = TemperatureModuleData as jest.MockedFunction<
  typeof TemperatureModuleData
>

const mockThermocyclerModuleData = ThermocyclerModuleData as jest.MockedFunction<
  typeof ThermocyclerModuleData
>

const mockMagneticModuleHub = {
  model: 'magneticModuleV1',
  type: 'magneticModuleType',
  port: '/dev/ot_module_magdeck0',
  serial: 'def456',
  revision: 'mag_deck_v4.0',
  fwVersion: 'v2.0.0',
  status: 'disengaged',
  hasAvailableUpdate: true,
  data: {
    engaged: false,
    height: 42,
  },
  usbPort: { hub: 2, port: null },
} as MagneticModule

const render = (props: React.ComponentProps<typeof ModuleCard>) => {
  return renderWithProviders(<ModuleCard {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ModuleCard', () => {
  beforeEach(() => {
    mockMagneticModuleData.mockReturnValue(<div>Mock Magnetic Module Data</div>)
    mockThermocyclerModuleData.mockReturnValue(
      <div>Mock Thermocycler Module Data</div>
    )
  })

  afterEach(() => {
    jest.resetAllMocks()
  })
  afterEach(() => {
    resetAllWhenMocks()
  })

  it('renders information for a magnetic module with mocked status', () => {
    const { getByText, getByAltText } = render({
      module: mockMagneticModule,
    })

    getByText('Magnetic Module GEN1')
    getByText('Mock Magnetic Module Data')
    getByText('usb port 1')
    getByAltText('magneticModuleV1')
  })
  it('renders information if module is connected via hub', () => {
    const { getByText, getByAltText } = render({
      module: mockMagneticModuleHub,
    })
    getByText('Magnetic Module GEN1')
    getByText('Mock Magnetic Module Data')
    getByText('usb port 2 via hub')
    getByAltText('magneticModuleV1')
  })
  it('renders information for a temperature module with mocked status', () => {
    mockTemperatureModuleData.mockReturnValue(
      <div>Mock Temperature Module Data</div>
    )

    const { getByText, getByAltText } = render({
      module: mockTemperatureModuleGen2,
    })
    getByText('Temperature Module GEN2')
    getByText('Mock Temperature Module Data')
    getByText('usb port 1')
    getByAltText('temperatureModuleV2')
  })

  it('renders information for a thermocycler module with mocked status', () => {
    const { getByText, getByAltText } = render({
      module: mockThermocycler,
    })

    getByText('Thermocycler Module')
    getByText('Mock Thermocycler Module Data')
    getByText('usb port 1')
    getByAltText('thermocyclerModuleV1')
  })

  //  TODO Immediately: add more details to this test when overflow button has more functionality
  it('renders 3 dot button icon and is clickable', () => {
    const { getByRole, getByText } = render({
      module: mockMagneticModule,
    })

    const overflowButton = getByRole('button', {
      name: /overflow/i,
    })
    getByText('Magnetic Module GEN1')
    fireEvent.click(overflowButton)
    expect(overflowButton).not.toBeDisabled()
  })
})
