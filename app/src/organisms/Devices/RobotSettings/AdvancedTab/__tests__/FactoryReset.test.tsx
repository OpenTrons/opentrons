import { i18n } from '../../../../../i18n'
import { FactoryReset } from '../FactoryReset'
import { renderWithProviders } from '@opentrons/components'
import { fireEvent } from '@testing-library/react'
import * as React from 'react'
import { MemoryRouter } from 'react-router-dom'

const mockUpdateIsEXpanded = jest.fn()

jest.mock('../../../../ProtocolUpload/hooks')

const render = (isRobotBusy = false) => {
  return renderWithProviders(
    <MemoryRouter>
      <FactoryReset
        updateIsExpanded={mockUpdateIsEXpanded}
        isRobotBusy={isRobotBusy}
      />
    </MemoryRouter>,
    { i18nInstance: i18n }
  )
}

describe('RobotSettings FactoryReset', () => {
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
    const button = getByRole('button', {
      name: 'Choose reset settings',
    })
    fireEvent.click(button)
    expect(mockUpdateIsEXpanded).toHaveBeenCalled()
  })

  it('should call update robot status if a robot is busy', () => {
    const [{ getByRole }] = render(true)
    const button = getByRole('button', {
      name: 'Choose reset settings',
    })
    expect(button).toBeDisabled()
  })
})
