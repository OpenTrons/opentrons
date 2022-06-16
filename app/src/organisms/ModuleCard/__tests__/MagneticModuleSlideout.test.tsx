import * as React from 'react'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@opentrons/components'
import { i18n } from '../../../i18n'
import {
  useCreateCommandMutation,
  useCreateLiveCommandMutation,
} from '@opentrons/react-api-client'
import { useModuleIdFromRun } from '../useModuleIdFromRun'
import { MagneticModuleSlideout } from '../MagneticModuleSlideout'

import {
  mockMagneticModule,
  mockMagneticModuleGen2,
} from '../../../redux/modules/__fixtures__'

jest.mock('@opentrons/react-api-client')
jest.mock('../useModuleIdFromRun')

const mockUseLiveCommandMutation = useCreateLiveCommandMutation as jest.MockedFunction<
  typeof useCreateLiveCommandMutation
>
const mockUseCommandMutation = useCreateCommandMutation as jest.MockedFunction<
  typeof useCreateCommandMutation
>
const mockUseModuleIdFromRun = useModuleIdFromRun as jest.MockedFunction<
  typeof useModuleIdFromRun
>

const render = (props: React.ComponentProps<typeof MagneticModuleSlideout>) => {
  return renderWithProviders(<MagneticModuleSlideout {...props} />, {
    i18nInstance: i18n,
  })[0]
}
describe('MagneticModuleSlideout', () => {
  let props: React.ComponentProps<typeof MagneticModuleSlideout>
  let mockCreateLiveCommand = jest.fn()
  let mockCreateCommand = jest.fn()
  beforeEach(() => {
    mockCreateLiveCommand = jest.fn()
    mockCreateLiveCommand.mockResolvedValue(null)
    props = {
      module: mockMagneticModule,
      isExpanded: true,
      onCloseClick: jest.fn(),
    }
    mockUseLiveCommandMutation.mockReturnValue({
      createLiveCommand: mockCreateLiveCommand,
    } as any)

    mockCreateCommand = jest.fn()
    mockCreateCommand.mockResolvedValue(null)
    mockUseCommandMutation.mockReturnValue({
      createCommand: mockCreateCommand,
    } as any)
    mockUseModuleIdFromRun.mockReturnValue({ moduleIdFromRun: 'magdeck_id' })
  })
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders correct title and body for a gen1 magnetic module', () => {
    const { getByText } = render(props)

    getByText('Set Engage Height for Magnetic Module GEN1')
    getByText(
      'Set the engage height for this Magnetic Module. Enter an integer between -5 and 40.'
    )
    getByText('GEN 1 Height Ranges')
    getByText('Max Engage Height')
    getByText('Labware Bottom')
    getByText('Disengaged')
    getByText('40')
    getByText('0')
    getByText('-5')
    getByText('Set Engage Height')
    getByText('Confirm')
  })

  it('renders correct title and body for a gen2 magnetic module', () => {
    props = {
      module: mockMagneticModuleGen2,
      isExpanded: true,
      onCloseClick: jest.fn(),
    }
    const { getByText } = render(props)

    getByText('Set Engage Height for Magnetic Module GEN2')
    getByText(
      'Set the engage height for this Magnetic Module. Enter an integer between -4 and 16.'
    )
    getByText('GEN 2 Height Ranges')
    getByText('Max Engage Height')
    getByText('Labware Bottom')
    getByText('Disengaged')
    getByText('16 mm')
    getByText('0 mm')
    getByText('-4 mm')
    getByText('Set Engage Height')
    getByText('Confirm')
  })

  it('renders the button and it is not clickable until there is something in form field', () => {
    const { getByRole, getByTestId } = render(props)
    const button = getByRole('button', { name: 'Confirm' })
    const input = getByTestId('magneticModuleV1')
    fireEvent.change(input, { target: { value: '10' } })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'magneticModule/engage',
        params: {
          moduleId: 'magdeck_id',
          height: 10,
        },
      },
    })
    expect(button).not.toBeEnabled()
  })

  it('renders the button and it is not clickable until there is something in form field when there is a runId', () => {
    props = {
      module: mockMagneticModule,
      isExpanded: true,
      onCloseClick: jest.fn(),
      runId: 'test123',
    }

    const { getByRole, getByTestId } = render(props)
    const button = getByRole('button', { name: 'Confirm' })
    const input = getByTestId('magneticModuleV1')
    fireEvent.change(input, { target: { value: '10' } })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(mockCreateCommand).toHaveBeenCalledWith({
      runId: props.runId,
      command: {
        commandType: 'magneticModule/engage',
        params: {
          moduleId: 'magdeck_id',
          height: 10,
        },
      },
    })
    expect(button).not.toBeEnabled()
  })
})
