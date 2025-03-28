import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, expect, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { getResetConfigOptions } from '/app/redux/robot-admin'
import { useIsFlex } from '/app/redux-resources/robots'
import { DeviceResetSlideout } from '../DeviceResetSlideout'

vi.mock('/app/redux/config')
vi.mock('/app/redux/discovery')
vi.mock('/app/redux/robot-admin/selectors')
vi.mock('/app/redux-resources/robots')
vi.mock('../../../../hooks')

const mockOnCloseClick = vi.fn()
const ROBOT_NAME = 'otie'
const mockUpdateResetStatus = vi.fn()

const mockResetConfigOptions = [
  {
    id: 'bootScripts',
    name: 'BootScript Foo',
    description: 'BootScript foo description',
  },
  {
    id: 'deckCalibration',
    name: 'deck Calibration Bar',
    description: 'deck Calibration bar description',
  },
  {
    id: 'pipetteOffsetCalibrations',
    name: 'pipette calibration FooBar',
    description: 'pipette calibration fooBar description',
  },
  {
    id: 'gripperOffsetCalibrations',
    name: 'gripper calibration FooBar',
    description: 'gripper calibration fooBar description',
  },
  {
    id: 'runsHistory',
    name: 'RunsHistory FooBar',
    description: 'runsHistory fooBar description',
  },
  {
    id: 'tipLengthCalibrations',
    name: 'tip length FooBar',
    description: 'tip length fooBar description',
  },
  {
    id: 'moduleCalibration',
    name: 'module calibration FooBar',
    description: 'moduleCalibration fooBar description',
  },
  {
    id: 'authorizedKeys',
    name: 'SSH Keys Foo',
    description: 'SSH Keys foo description',
  },
]

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <DeviceResetSlideout
        isExpanded={true}
        onCloseClick={mockOnCloseClick}
        robotName={ROBOT_NAME}
        updateResetStatus={mockUpdateResetStatus}
      />
    </MemoryRouter>,
    { i18nInstance: i18n }
  )
}

describe('RobotSettings DeviceResetSlideout', () => {
  beforeEach(() => {
    vi.mocked(getResetConfigOptions).mockReturnValue(mockResetConfigOptions)
    vi.mocked(useIsFlex).mockReturnValue(false)
  })

  it('should render title, description, checkboxes, links and button: OT-2', () => {
    render()
    screen.getByText('Device Reset')
    screen.getByText('Resets cannot be undone')
    screen.getByText('Clear individual data')
    screen.getByText(
      'Select individual settings to only clear specific data types.'
    )
    screen.getByText('Robot Calibration Data')
    screen.getByText('Clear deck calibration')
    screen.getByText('Clear pipette offset calibrations')
    screen.getByText('Clear tip length calibrations')
    screen.getByText('Protocol run data')
    screen.getByText('Clear protocol run history')
    screen.getByText('Clear labware offset data')
    screen.getByText('Boot scripts')
    screen.getByText('Clear custom boot scripts')
    screen.getByText('Clear SSH public keys')
    const downloads = screen.getAllByText('Download')
    expect(downloads.length).toBe(2)
    screen.getByRole('checkbox', { name: 'Clear deck calibration' })
    screen.getByRole('checkbox', { name: 'Clear pipette offset calibrations' })
    screen.getByRole('checkbox', { name: 'Clear tip length calibrations' })
    screen.getByRole('checkbox', { name: 'Clear protocol run history' })
    screen.getByRole('checkbox', { name: 'Clear custom boot scripts' })
    screen.getByRole('checkbox', { name: 'Clear SSH public keys' })
    screen.getByRole('button', { name: 'Clear data and restart robot' })
    screen.getByTestId('Slideout_icon_close_Device Reset')
  })

  it('should change some options and text for Flex', () => {
    vi.mocked(useIsFlex).mockReturnValue(true)
    render()
    screen.getByText('Clear all data')
    screen.getByText(
      'Clears calibrations, protocols, and all settings except robot name and network settings.'
    )
    expect(screen.queryByText('Clear deck calibration')).toBeNull()
    screen.getByText('Clear pipette calibration')
    expect(screen.queryByText('Clear tip length calibrations')).toBeNull()
    screen.getByText('Clear gripper calibration')
    screen.getByRole('checkbox', { name: 'Clear pipette calibration' })
    screen.getByRole('checkbox', { name: 'Clear gripper calibration' })
    screen.getByRole('checkbox', { name: 'Clear module calibration' })
    expect(
      screen.queryByRole('checkbox', { name: 'Clear deck calibration' })
    ).toBeNull()
    expect(
      screen.queryByRole('checkbox', { name: 'Clear tip length calibrations' })
    ).toBeNull()
  })

  it('should enable Clear data and restart robot button when checked one checkbox', () => {
    render()
    const checkbox = screen.getByRole('checkbox', {
      name: 'Clear deck calibration',
    })
    fireEvent.click(checkbox)
    const clearButton = screen.getByRole('button', {
      name: 'Clear data and restart robot',
    })
    expect(clearButton).toBeEnabled()
  })

  it('should close the slideout when clicking close icon button', () => {
    render()
    const closeButton = screen.getByTestId('Slideout_icon_close_Device Reset')
    fireEvent.click(closeButton)
    expect(mockOnCloseClick).toHaveBeenCalled()
  })
})
