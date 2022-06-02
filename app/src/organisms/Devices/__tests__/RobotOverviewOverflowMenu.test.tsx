import * as React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { when, resetAllWhenMocks } from 'jest-when'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@opentrons/components'
import { RUN_STATUS_IDLE, RUN_STATUS_RUNNING } from '@opentrons/api-client'
import { i18n } from '../../../i18n'
import { home } from '../../../redux/robot-controls'
import { UpdateBuildroot } from '../../../pages/Robots/RobotSettings/UpdateBuildroot'
import * as Buildroot from '../../../redux/buildroot'
import { restartRobot } from '../../../redux/robot-admin'
import { mockConnectableRobot } from '../../../redux/discovery/__fixtures__'
import { useCurrentRunStatus } from '../../RunTimeControl/hooks'
import { RobotOverviewOverflowMenu } from '../RobotOverviewOverflowMenu'

jest.mock('../../RunTimeControl/hooks')
jest.mock('../../../redux/robot-controls')
jest.mock('../../../redux/robot-admin')
jest.mock('../../../redux/buildroot')
jest.mock('../../../pages/Robots/RobotSettings/UpdateBuildroot')

const mockUseCurrentRunStatus = useCurrentRunStatus as jest.MockedFunction<
  typeof useCurrentRunStatus
>
const getBuildrootUpdateDisplayInfo = Buildroot.getBuildrootUpdateDisplayInfo as jest.MockedFunction<
  typeof Buildroot.getBuildrootUpdateDisplayInfo
>
const mockHome = home as jest.MockedFunction<typeof home>
const mockRestartRobot = restartRobot as jest.MockedFunction<
  typeof restartRobot
>
const mockUpdateBuildroot = UpdateBuildroot as jest.MockedFunction<
  typeof UpdateBuildroot
>

const render = (
  props: React.ComponentProps<typeof RobotOverviewOverflowMenu>
) => {
  return renderWithProviders(
    <MemoryRouter>
      <RobotOverviewOverflowMenu {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('RobotOverviewOverflowMenu', () => {
  let props: React.ComponentProps<typeof RobotOverviewOverflowMenu>
  beforeEach(() => {
    props = { robot: mockConnectableRobot }
    when(getBuildrootUpdateDisplayInfo).mockReturnValue({
      autoUpdateAction: 'upgrade',
      autoUpdateDisabledReason: null,
      updateFromFileDisabledReason: null,
    })
    when(mockUseCurrentRunStatus).calledWith().mockReturnValue(RUN_STATUS_IDLE)
    when(mockUpdateBuildroot).mockReturnValue(<div>mock update buildroot</div>)
  })
  afterEach(() => {
    resetAllWhenMocks()
  })

  it('should render enabled buttons in the menu when the status is idle', () => {
    const { getByRole, getByText } = render(props)

    const btn = getByRole('button')
    fireEvent.click(btn)

    const updateRobotSoftwareBtn = getByRole('button', {
      name: 'Update robot software',
    })
    const restartBtn = getByRole('button', { name: 'restart robot' })
    const homeBtn = getByRole('button', { name: 'Home gantry' })
    const settingsBtn = getByRole('link', { name: 'robot settings' })

    expect(updateRobotSoftwareBtn).toBeEnabled()
    expect(restartBtn).toBeEnabled()
    expect(homeBtn).toBeEnabled()
    expect(settingsBtn).toBeEnabled()
    fireEvent.click(updateRobotSoftwareBtn)
    getByText('mock update buildroot')
  })

  it('should render disabled buttons in the menu when the run status is running', () => {
    when(mockUseCurrentRunStatus)
      .calledWith()
      .mockReturnValue(RUN_STATUS_RUNNING)

    const { getByRole } = render(props)

    const btn = getByRole('button')
    fireEvent.click(btn)

    const updateRobotSoftwareBtn = getByRole('button', {
      name: 'Update robot software',
    })
    const restartBtn = getByRole('button', { name: 'restart robot' })
    const homeBtn = getByRole('button', { name: 'Home gantry' })

    expect(updateRobotSoftwareBtn).toBeDisabled()
    expect(restartBtn).toBeDisabled()
    expect(homeBtn).toBeDisabled()
  })

  it('clicking home gantry should home the gantry', () => {
    const { getByRole } = render(props)

    const btn = getByRole('button')
    fireEvent.click(btn)

    const homeBtn = getByRole('button', { name: 'Home gantry' })
    fireEvent.click(homeBtn)

    expect(mockHome).toBeCalled()
  })

  it('clicking the restart robot button should restart the robot', () => {
    const { getByRole } = render(props)

    const btn = getByRole('button')
    fireEvent.click(btn)

    const restartBtn = getByRole('button', { name: 'restart robot' })
    fireEvent.click(restartBtn)

    expect(mockRestartRobot).toBeCalled()
  })
  it('render overflow menu buttons without the update robot software button', () => {
    when(getBuildrootUpdateDisplayInfo).mockReturnValue({
      autoUpdateAction: 'reinstall',
      autoUpdateDisabledReason: null,
      updateFromFileDisabledReason: null,
    })
    const { getByRole } = render(props)
    const btn = getByRole('button')
    fireEvent.click(btn)
    getByRole('button', { name: 'restart robot' })
    getByRole('button', { name: 'Home gantry' })
    getByRole('link', { name: 'robot settings' })
  })
})
