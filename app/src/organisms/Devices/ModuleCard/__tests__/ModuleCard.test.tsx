import * as React from 'react'
import { resetAllWhenMocks, when } from 'jest-when'
import { fireEvent } from '@testing-library/react'
import { RUN_STATUS_IDLE, RUN_STATUS_RUNNING } from '@opentrons/api-client'
import { nestedTextMatcher, renderWithProviders } from '@opentrons/components'
import { i18n } from '../../../../i18n'
import {
  DispatchApiRequestType,
  useDispatchApiRequest,
} from '../../../../redux/robot-api'
import { Toast } from '../../../../atoms/Toast'
import { useCurrentRunStatus } from '../../../RunTimeControl/hooks'
import * as RobotApi from '../../../../redux/robot-api'
import { MagneticModuleData } from '../MagneticModuleData'
import { TemperatureModuleData } from '../TemperatureModuleData'
import { ThermocyclerModuleData } from '../ThermocyclerModuleData'
import { HeaterShakerModuleData } from '../HeaterShakerModuleData'
import { ModuleOverflowMenu } from '../ModuleOverflowMenu'
import { FirmwareUpdateFailedModal } from '../FirmwareUpdateFailedModal'
import { getIsHeaterShakerAttached } from '../../../../redux/config'
import { ModuleCard } from '..'
import {
  mockMagneticModule,
  mockTemperatureModuleGen2,
  mockThermocycler,
  mockHeaterShaker,
} from '../../../../redux/modules/__fixtures__'
import { mockRobot } from '../../../../redux/robot-api/__fixtures__'

import type {
  HeaterShakerModule,
  MagneticModule,
} from '../../../../redux/modules/types'

jest.mock('../MagneticModuleData')
jest.mock('../TemperatureModuleData')
jest.mock('../ThermocyclerModuleData')
jest.mock('../HeaterShakerModuleData')
jest.mock('../../../../redux/config')
jest.mock('../ModuleOverflowMenu')
jest.mock('../../../RunTimeControl/hooks')
jest.mock('../FirmwareUpdateFailedModal')
jest.mock('../../../../redux/robot-api')
jest.mock('../../../../atoms/Toast')
jest.mock('react-router-dom', () => {
  const reactRouterDom = jest.requireActual('react-router-dom')
  return {
    ...reactRouterDom,
    useHistory: () => ({ push: jest.fn() } as any),
  }
})

const mockMagneticModuleData = MagneticModuleData as jest.MockedFunction<
  typeof MagneticModuleData
>
const mockTemperatureModuleData = TemperatureModuleData as jest.MockedFunction<
  typeof TemperatureModuleData
>
const mockModuleOverflowMenu = ModuleOverflowMenu as jest.MockedFunction<
  typeof ModuleOverflowMenu
>
const mockThermocyclerModuleData = ThermocyclerModuleData as jest.MockedFunction<
  typeof ThermocyclerModuleData
>
const mockHeaterShakerModuleData = HeaterShakerModuleData as jest.MockedFunction<
  typeof HeaterShakerModuleData
>
const mockGetIsHeaterShakerAttached = getIsHeaterShakerAttached as jest.MockedFunction<
  typeof getIsHeaterShakerAttached
>
const mockUseCurrentRunStatus = useCurrentRunStatus as jest.MockedFunction<
  typeof useCurrentRunStatus
>
const mockUseDispatchApiRequest = useDispatchApiRequest as jest.MockedFunction<
  typeof useDispatchApiRequest
>
const mockGetRequestById = RobotApi.getRequestById as jest.MockedFunction<
  typeof RobotApi.getRequestById
>
const mockFirmwareUpdateFailedModal = FirmwareUpdateFailedModal as jest.MockedFunction<
  typeof FirmwareUpdateFailedModal
>
const mockToast = Toast as jest.MockedFunction<typeof Toast>
const mockMagneticModuleHub = {
  id: 'magdeck_id',
  moduleModel: 'magneticModuleV1',
  moduleType: 'magneticModuleType',
  serialNumber: 'def456',
  hardwareRevision: 'mag_deck_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    engaged: false,
    height: 42,
    status: 'disengaged',
  },
  usbPort: { hub: 2, path: '/dev/ot_module_magdeck0', port: null },
} as MagneticModule

const mockHotHeaterShaker = {
  id: 'heatershaker_id',
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  serialNumber: 'jkl123',
  hardwareRevision: 'heatershaker_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: false,
  data: {
    labwareLatchStatus: 'idle_open',
    speedStatus: 'idle',
    temperatureStatus: 'heating',
    currentSpeed: null,
    currentTemperature: 50,
    targetSpeed: null,
    targetTemperature: 60,
    errorDetails: null,
    status: 'idle',
  },
  usbPort: { path: '/dev/ot_module_heatershaker0', hub: null, port: 1 },
} as HeaterShakerModule

const render = (props: React.ComponentProps<typeof ModuleCard>) => {
  return renderWithProviders(<ModuleCard {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ModuleCard', () => {
  let dispatchApiRequest: DispatchApiRequestType

  beforeEach(() => {
    dispatchApiRequest = jest.fn()
    mockUseDispatchApiRequest.mockReturnValue([dispatchApiRequest, ['id']])
    mockMagneticModuleData.mockReturnValue(<div>Mock Magnetic Module Data</div>)
    mockThermocyclerModuleData.mockReturnValue(
      <div>Mock Thermocycler Module Data</div>
    )
    mockHeaterShakerModuleData.mockReturnValue(
      <div>Mock Heater Shaker Module Data</div>
    )
    mockModuleOverflowMenu.mockReturnValue(<div>mock module overflow menu</div>)
    mockFirmwareUpdateFailedModal.mockReturnValue(
      <div>mock firmware update failed modal</div>
    )
    mockToast.mockReturnValue(<div>mock toast</div>)
    mockGetRequestById.mockReturnValue(null)
    when(mockUseCurrentRunStatus)
      .calledWith(expect.any(Object))
      .mockReturnValue(RUN_STATUS_IDLE)
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
      robotName: mockRobot.name,
    })

    getByText('Magnetic Module GEN1')
    getByText('Mock Magnetic Module Data')
    getByText('usb port 1')
    getByAltText('magneticModuleV1')
  })
  it('renders information if module is connected via hub', () => {
    const { getByText, getByAltText } = render({
      module: mockMagneticModuleHub,
      robotName: mockRobot.name,
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
      robotName: mockRobot.name,
    })
    getByText('Temperature Module GEN2')
    getByText('Mock Temperature Module Data')
    getByText('usb port 1')
    getByAltText('temperatureModuleV2')
  })

  it('renders information for a thermocycler module with mocked status', () => {
    const { getByText, getByAltText } = render({
      module: mockThermocycler,
      robotName: mockRobot.name,
    })

    getByText('Thermocycler Module')
    getByText('Mock Thermocycler Module Data')
    getByText('usb port 1')
    getByAltText('thermocyclerModuleV1')
  })

  it('renders information for a heater shaker module with mocked status', () => {
    mockGetIsHeaterShakerAttached.mockReturnValue(true)
    const { getByText, getByAltText } = render({
      module: mockHeaterShaker,
      robotName: mockRobot.name,
    })

    getByText('Heater Shaker Module GEN1')
    getByText('Mock Heater Shaker Module Data')
    getByText('usb port 1')
    getByAltText('heaterShakerModuleV1')
  })

  it('renders kebab icon and is clickable', () => {
    const { getByRole, getByText } = render({
      module: mockMagneticModule,
      robotName: mockRobot.name,
    })
    const overflowButton = getByRole('button', {
      name: /overflow/i,
    })
    getByText('Magnetic Module GEN1')
    fireEvent.click(overflowButton)
    expect(overflowButton).not.toBeDisabled()
    getByText('mock module overflow menu')
  })

  it('renders kebab icon and it is disabled when run is in progress', () => {
    when(mockUseCurrentRunStatus)
      .calledWith(expect.any(Object))
      .mockReturnValue(RUN_STATUS_RUNNING)

    const { getByRole, getByText } = render({
      module: mockMagneticModule,
      robotName: mockRobot.name,
    })
    const overflowButton = getByRole('button', {
      name: /overflow/i,
    })
    getByText('Magnetic Module GEN1')
    expect(overflowButton).toBeDisabled()
  })

  it('renders information for a heater shaker module when it is hot, showing the too hot banner', () => {
    const { getByText } = render({
      module: mockHotHeaterShaker,
      robotName: mockRobot.name,
    })
    getByText(nestedTextMatcher('Module is hot to the touch'))
  })
  it('renders information success toast when update has completed', () => {
    mockGetRequestById.mockReturnValue({
      status: RobotApi.SUCCESS,
      response: {
        method: 'POST',
        ok: true,
        path: '/',
        status: 200,
      },
    })
    const { getByText } = render({
      module: mockHotHeaterShaker,
      robotName: mockRobot.name,
    })
    getByText('mock toast')
  })
  it('renders information for a magnetic module when an update is available so update banner renders', () => {
    const { getByText } = render({
      module: mockMagneticModuleHub,
      robotName: mockRobot.name,
    })
    getByText('Firmware update available.')
    const button = getByText('Update now')
    fireEvent.click(button)
    expect(mockGetRequestById).toHaveBeenCalled()
  })
  it('renders information for update available and it fails rendering the fail modal', () => {
    mockGetRequestById.mockReturnValue({
      status: RobotApi.FAILURE,
      response: {
        method: 'POST',
        ok: false,
        path: '/',
        status: 500,
      },
      error: { message: 'ruh roh' },
    })

    const { getByText } = render({
      module: mockMagneticModuleHub,
      robotName: mockRobot.name,
    })
    getByText('Firmware update available.')
    const button = getByText('Update now')
    fireEvent.click(button)
    expect(mockGetRequestById).toHaveBeenCalled()
    expect(getByText('mock firmware update failed modal')).toBeVisible()
  })
  it('renders information for update available and updating now text shows up when update is in progress', () => {
    mockGetRequestById.mockReturnValue({
      status: RobotApi.PENDING,
    })
    const { getByText, getByLabelText } = render({
      module: mockMagneticModuleHub,
      robotName: mockRobot.name,
    })
    expect(getByText('Updating firmware...')).toBeVisible()
    expect(getByLabelText('ot-spinner')).toBeVisible()
  })
})
