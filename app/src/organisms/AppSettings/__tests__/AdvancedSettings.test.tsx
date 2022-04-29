import * as React from 'react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import { renderWithProviders } from '@opentrons/components'
import { i18n } from '../../../i18n'
import * as CustomLabware from '../../../redux/custom-labware'
import * as Config from '../../../redux/config'
import * as SystemInfo from '../../../redux/system-info'
import * as Fixtures from '../../../redux/system-info/__fixtures__'

import { AdvancedSettings } from '../AdvancedSettings'

jest.mock('../../../redux/config')
jest.mock('../../../redux/calibration')
jest.mock('../../../redux/custom-labware')
jest.mock('../../../redux/discovery')
jest.mock('../../../redux/system-info')

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <AdvancedSettings />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

const getCustomLabwarePath = CustomLabware.getCustomLabwareDirectory as jest.MockedFunction<
  typeof CustomLabware.getCustomLabwareDirectory
>
const getChannelOptions = Config.getUpdateChannelOptions as jest.MockedFunction<
  typeof Config.getUpdateChannelOptions
>

const mockGetIsLabwareOffsetCodeSnippetsOn = Config.getIsLabwareOffsetCodeSnippetsOn as jest.MockedFunction<
  typeof Config.getIsLabwareOffsetCodeSnippetsOn
>

const mockGetU2EAdapterDevice = SystemInfo.getU2EAdapterDevice as jest.MockedFunction<
  typeof SystemInfo.getU2EAdapterDevice
>

const mockGetU2EWindowsDriverStatus = SystemInfo.getU2EWindowsDriverStatus as jest.MockedFunction<
  typeof SystemInfo.getU2EWindowsDriverStatus
>

describe('AdvancedSettings', () => {
  beforeEach(() => {
    getCustomLabwarePath.mockReturnValue('')
    getChannelOptions.mockReturnValue([
      {
        name: 'Stable',
        value: 'latest',
      },
      { name: 'Beta', value: 'beta' },
      { name: 'Alpha', value: 'alpha' },
    ])
    mockGetU2EAdapterDevice.mockReturnValue(Fixtures.mockWindowsRealtekDevice)
    mockGetU2EWindowsDriverStatus.mockReturnValue(SystemInfo.OUTDATED)
  })
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders correct titles', () => {
    const [{ getByText }] = render()
    getByText('Update Channel')
    getByText('Additional Custom Labware Source Folder')
    getByText('Tip Length Calibration Method')
    getByText('Display Unavailable Robots')
    getByText('Clear Unavailable Robots')
    getByText('Enable Developer Tools')
  })
  it('renders the update channel section', () => {
    const [{ getByText, getByRole }] = render()
    getByText(
      'Stable receives the latest stable releases. Beta allows you to try out new features before they have completed testing and launch in the Stable channel.'
    )
    getByRole('option', { name: 'Stable' })
    getByRole('option', { name: 'Beta' })
    getByRole('option', { name: 'Alpha' })
  })
  it('renders the custom labware section with source folder selected', () => {
    getCustomLabwarePath.mockReturnValue('/mock/custom-labware-path')
    const [{ getByText, getByRole }] = render()
    getByText(
      'If you want to specify a folder to manually manage Custom Labware files, you can add the directory here.'
    )
    getByText('Additional Source Folder')
    getByRole('button', { name: 'Change labware source folder' })
  })
  it('renders the custom labware section with no source folder selected', () => {
    const [{ getByText, getByRole }] = render()
    getByText('No additional source folder specified')
    getByRole('button', { name: 'Add labware source folder' })
  })
  it('renders the tip length cal section', () => {
    const [{ getByRole }] = render()
    getByRole('radio', { name: 'Always use calibration block to calibrate' })
    getByRole('radio', { name: 'Always use trash bin to calibrate' })
    getByRole('radio', {
      name: 'Always show the prompt to choose calibration block or trash bin',
    })
  })
  it('renders the display unavailable robots section', () => {
    const [{ getByText, getByRole }] = render()
    getByText(
      'Disabling this may improve overall networking performance in environments with many robots, but it may be slower to find robots when opening the app.'
    )
    getByRole('switch', { name: 'display_unavailable_robots' })
  })

  it('render the usb-to-ethernet adapter information', () => {
    const [{ getByText }] = render()
    getByText('USB-to-Ethernet Adapter Information')
    getByText(
      'Some OT-2s have an internal USB-to-Ethernet adapter. If your OT-2 uses this adapter, it will be added to your computer’s device list when you make a wired connection. If you have a Realtek adapter, it is essential that the driver is up to date.'
    )
    getByText('Description')
    getByText('Manufacturer')
    getByText('Driver Version')
  })

  it('renders the test data of the usb-to-ethernet adapter information with mac', () => {
    mockGetU2EAdapterDevice.mockReturnValue({
      ...Fixtures.mockRealtekDevice,
    })
    mockGetU2EWindowsDriverStatus.mockReturnValue(SystemInfo.NOT_APPLICABLE)
    const [{ getByText, queryByText }] = render()
    getByText('USB 10/100 LAN')
    getByText('Realtek')
    getByText('Unknown')
    expect(
      queryByText(
        'An update is available for Realtek USB-to-Ethernet adapter driver'
      )
    ).not.toBeInTheDocument()
    expect(queryByText('go to Realtek.com')).not.toBeInTheDocument()
  })

  it('renders the test data of the outdated usb-to-ethernet adapter information with windows', () => {
    const [{ getByText }] = render()
    getByText('Realtek USB FE Family Controller')
    getByText('Realtek')
    getByText('1.2.3')
    getByText(
      'An update is available for Realtek USB-to-Ethernet adapter driver'
    )
    const targetLink = 'https://www.realtek.com/en/'
    const link = getByText('go to Realtek.com')
    expect(link.closest('a')).toHaveAttribute('href', targetLink)
  })

  it('renders the test data of the updated usb-to-ethernet adapter information with windows', () => {
    mockGetU2EWindowsDriverStatus.mockReturnValue(SystemInfo.UP_TO_DATE)
    const [{ getByText, queryByText }] = render()
    getByText('Realtek USB FE Family Controller')
    getByText('Realtek')
    getByText('1.2.3')
    expect(
      queryByText(
        'An update is available for Realtek USB-to-Ethernet adapter driver'
      )
    ).not.toBeInTheDocument()
    expect(queryByText('go to Realtek.com')).not.toBeInTheDocument()
  })

  it('renders the not connected message and not display item titles when USB-to-Ethernet is not connected', () => {
    mockGetU2EAdapterDevice.mockReturnValue(null)
    const [{ getByText, queryByText }] = render()
    expect(queryByText('Description')).not.toBeInTheDocument()
    expect(queryByText('Manufacturer')).not.toBeInTheDocument()
    expect(queryByText('Driver Version')).not.toBeInTheDocument()
    getByText('No USB-to-Ethernet adapter connected')
  })

  it('renders the display show link to get labware offset data section', () => {
    const [{ getByText, getByRole }] = render()
    getByText('Show Link to Get Labware Offset Data')
    getByText(
      'If you need to access Labware Offset data outside of the Opentrons App, enabling this setting will display a link to get Offset Data in the Recent Runs overflow menu and in the Labware Setup section of the Protocol page.'
    )
    getByRole('switch', { name: 'show_link_to_get_labware_offset_data' })
  })

  it('renders the toggle button on when show link to labware offset data setting is true', () => {
    mockGetIsLabwareOffsetCodeSnippetsOn.mockReturnValue(true)
    const [{ getByRole }] = render()
    const toggleButton = getByRole('switch', {
      name: 'show_link_to_get_labware_offset_data',
    })
    expect(toggleButton.getAttribute('aria-checked')).toBe('true')
  })

  it('renders the clear unavailable robots section', () => {
    const [{ getByText, getByRole }] = render()
    getByText(
      'Clear the list of unavailable robots on the Devices page. This action cannot be undone.'
    )
    getByRole('button', {
      name: 'Clear unavailable robots list',
    })
  })
  it('renders the developer tools section', () => {
    const [{ getByText, getByRole }] = render()
    getByText(
      'Open Developer Tools on app launch, enable additional logging, and allow access to feature flags.'
    )
    getByRole('switch', { name: 'enable_dev_tools' })
  })
})
