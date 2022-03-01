import * as React from 'react'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@opentrons/components'
import { i18n } from '../../../../i18n'
import { getAttachedModules } from '../../../../redux/modules'
import { getConnectedRobotName } from '../../../../redux/robot/selectors'
import { mockMagneticModuleGen2 } from '../../../../redux/modules/__fixtures__'
import { HeaterShakerWizard } from '..'
import { Introduction } from '../Introduction'
import { KeyParts } from '../KeyParts'
import { AttachModule } from '../AttachModule'
import { AttachAdapter } from '../AttachAdapter'
import { PowerOn } from '../PowerOn'
import { TestShake } from '../TestShake'

jest.mock('../../../../redux/robot/selectors')
jest.mock('../Introduction')
jest.mock('../KeyParts')
jest.mock('../AttachModule')
jest.mock('../AttachAdapter')
jest.mock('../PowerOn')
jest.mock('../TestShake')
jest.mock('../../../../redux/modules')

const mockGetConnectedRobotName = getConnectedRobotName as jest.MockedFunction<
  typeof getConnectedRobotName
>
const mockIntroduction = Introduction as jest.MockedFunction<
  typeof Introduction
>
const mockKeyParts = KeyParts as jest.MockedFunction<typeof KeyParts>
const mockAttachModule = AttachModule as jest.MockedFunction<
  typeof AttachModule
>
const mockAttachAdapter = AttachAdapter as jest.MockedFunction<
  typeof AttachAdapter
>
const mockPowerOn = PowerOn as jest.MockedFunction<typeof PowerOn>
const mockTestShake = TestShake as jest.MockedFunction<typeof TestShake>
const mockGetAttachedModules = getAttachedModules as jest.MockedFunction<
  typeof getAttachedModules
>

const render = (props: React.ComponentProps<typeof HeaterShakerWizard>) => {
  return renderWithProviders(<HeaterShakerWizard {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('HeaterShakerWizard', () => {
  const props: React.ComponentProps<typeof HeaterShakerWizard> = {
    onCloseClick: jest.fn(),
  }
  beforeEach(() => {
    mockGetConnectedRobotName.mockReturnValue('Mock Robot')
    mockIntroduction.mockReturnValue(<div>Mock Introduction</div>)
    mockKeyParts.mockReturnValue(<div>Mock Key Parts</div>)
    mockAttachModule.mockReturnValue(<div>Mock Attach Module</div>)
    mockAttachAdapter.mockReturnValue(<div>Mock Attach Adapter</div>)
    mockPowerOn.mockReturnValue(<div>Mock Power On</div>)
    mockTestShake.mockReturnValue(<div>Mock Test Shake</div>)
    mockGetAttachedModules
      //  TODO(jr, 2022-02-18): change to heater shaker when getAttachedModules supports it
      .mockReturnValue([mockMagneticModuleGen2])
  })

  it('renders the main modal component of the wizard', () => {
    const { getByText } = render(props)
    getByText('Mock Robot - Attach Heater Shaker Module')
    getByText('Mock Introduction')
  })

  it('renders wizard and returns the correct pages when the buttons are clicked with test shake button disabled', () => {
    const { getByText, getByRole } = render(props)

    let button = getByRole('button', { name: 'Continue to attachment guide' })
    fireEvent.click(button)
    getByText('Mock Key Parts')

    button = getByRole('button', { name: 'Begin attachment' })
    fireEvent.click(button)
    getByText('Mock Attach Module')

    button = getByRole('button', { name: 'Continue to attach thermal adapter' })
    fireEvent.click(button)
    getByText('Mock Attach Adapter')

    button = getByRole('button', { name: 'Continue to power on module' })
    fireEvent.click(button)
    getByText('Mock Power On')

    button = getByRole('button', { name: 'Continue to test shake' })
    fireEvent.click(button)
    getByText('Mock Test Shake')

    getByRole('button', { name: 'Complete' })
  })

  it('renders power on component and the test shake button is not disabled', () => {
    mockGetAttachedModules.mockReturnValue([])

    const { getByText, getByRole } = render(props)

    let button = getByRole('button', { name: 'Continue to attachment guide' })
    fireEvent.click(button)
    getByText('Mock Key Parts')

    button = getByRole('button', { name: 'Begin attachment' })
    fireEvent.click(button)
    getByText('Mock Attach Module')

    button = getByRole('button', { name: 'Continue to attach thermal adapter' })
    fireEvent.click(button)
    getByText('Mock Attach Adapter')

    button = getByRole('button', { name: 'Continue to power on module' })
    fireEvent.click(button)
    getByText('Mock Power On')

    button = getByRole('button', { name: 'Continue to test shake' })
    expect(button).toBeDisabled()
  })
})
