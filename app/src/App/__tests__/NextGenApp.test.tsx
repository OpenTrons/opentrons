import * as React from 'react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import { resetAllWhenMocks, when } from 'jest-when'

import { renderWithProviders } from '@opentrons/components'

import { Breadcrumbs } from '../../molecules/Breadcrumbs'
import { DeviceDetails } from '../../pages/Devices/DeviceDetails'
import { DevicesLanding } from '../../pages/Devices/DevicesLanding'
import { AppSettings } from '../../pages/More/AppSettings'
import { usePathCrumbs } from '../hooks'
import { NextGenApp } from '../NextGenApp'

jest.mock('../../molecules/Breadcrumbs')
jest.mock('../../organisms/Devices/hooks')
jest.mock('../../pages/Devices/DeviceDetails')
jest.mock('../../pages/Devices/DevicesLanding')
jest.mock('../../pages/More/AppSettings')
jest.mock('../hooks')

const mockDeviceDetails = DeviceDetails as jest.MockedFunction<
  typeof DeviceDetails
>
mockDeviceDetails.mockReturnValue(<div>Mock DeviceDetails</div>)
const mockDevicesLanding = DevicesLanding as jest.MockedFunction<
  typeof DevicesLanding
>
mockDevicesLanding.mockReturnValue(<div>Mock DevicesLanding</div>)
const mockAppSettings = AppSettings as jest.MockedFunction<typeof AppSettings>
mockAppSettings.mockReturnValue(<div>Mock AppSettings</div>)
const mockBreadcrumbs = Breadcrumbs as jest.MockedFunction<typeof Breadcrumbs>
mockBreadcrumbs.mockReturnValue(<div>Mock Breadcrumbs</div>)
const mockUsePathCrumbs = usePathCrumbs as jest.MockedFunction<
  typeof usePathCrumbs
>

const render = (path = '/') => {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]} initialIndex={0}>
      <NextGenApp />
    </MemoryRouter>
  )
}

describe('NextGenApp', () => {
  beforeEach(() => {
    when(mockUsePathCrumbs).calledWith().mockReturnValue([])
  })
  afterEach(() => {
    resetAllWhenMocks()
  })

  it('renders a Breadcrumbs component', () => {
    const [{ getByText }] = render('/devices')
    getByText('Mock Breadcrumbs')
  })

  it('renders an AppSettings component', () => {
    const [{ getByText }] = render('/app-settings/feature-flags')
    getByText('Mock AppSettings')
  })

  it('renders a DevicesLanding component from /robots', () => {
    const [{ getByText }] = render('/devices')
    getByText('Mock DevicesLanding')
  })

  it('renders a DeviceDetails component from /robots/:robotName', () => {
    const [{ getByText }] = render('/devices/otie')
    getByText('Mock DeviceDetails')
  })

  it('renders an AppSettings component from /more', () => {
    const [{ getByText }] = render('/more')
    getByText('Mock AppSettings')
  })
})
