import * as React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent } from '@testing-library/react'

import { renderWithProviders } from '@opentrons/components'

import { i18n } from '../../../../../i18n'
import { useIsRobotBusy } from '../../../hooks'

import { FactoryReset } from '../FactoryReset'

const mockUpdateIsEXpanded = jest.fn()
const mockUpdateRobotStatus = jest.fn()

jest.mock('../../../hooks')
jest.mock('../../../../ProtocolUpload/hooks')

const mockUseIsRobotBusy = useIsRobotBusy as jest.MockedFunction<
  typeof useIsRobotBusy
>

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <FactoryReset
        updateIsExpanded={mockUpdateIsEXpanded}
        updateIsRobotBusy={mockUpdateRobotStatus}
      />
    </MemoryRouter>,
    { i18nInstance: i18n }
  )
}

describe('RobotSettings FactoryReset', () => {
  beforeEach(() => {
    mockUseIsRobotBusy.mockReturnValue(false)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should render title, description, and butoon', () => {
    const [{ getByText, getByRole }] = render()
    getByText('Factory reset')
    getByText(
      'Reset labware calibration, boot scripts, and/or robot calibration to factory settings.'
    )
    expect(
      getByRole('button', { name: 'Choose reset settings' })
    ).toBeInTheDocument()
  })

  it('should render a slideout when clicking the button', () => {
    const [{ getByRole }] = render()
    const factoryResetChooseButton = getByRole('button', {
      name: 'Choose reset settings',
    })
    fireEvent.click(factoryResetChooseButton)
    expect(mockUpdateIsEXpanded).toHaveBeenCalled()
  })

  it('should call update robot status if a robot is busy', () => {
    mockUseIsRobotBusy.mockReturnValue(true)
    const [{ getByRole }] = render()
    const button = getByRole('button', {
      name: 'Choose reset settings',
    })
    fireEvent.click(button)
    expect(mockUpdateRobotStatus).toHaveBeenCalled()
  })
})
