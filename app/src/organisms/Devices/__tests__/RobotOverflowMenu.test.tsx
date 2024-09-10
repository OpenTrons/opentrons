import * as React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { useCurrentRunId } from '../../../resources/runs'
import { ChooseProtocolSlideout } from '../../ChooseProtocolSlideout'
import { RobotOverflowMenu } from '../RobotOverflowMenu'
import { useIsRobotOnWrongVersionOfSoftware } from '../../../redux/robot-update'
import { useIsRobotBusy } from '../hooks'

import {
  mockUnreachableRobot,
  mockConnectedRobot,
} from '../../../redux/discovery/__fixtures__'

vi.mock('../../../redux/robot-update/hooks')
vi.mock('../../../resources/runs')
vi.mock('../../ChooseProtocolSlideout')
vi.mock('../hooks')
vi.mock('../../../resources/devices/hooks/useIsEstopNotDisengaged')

const render = (props: React.ComponentProps<typeof RobotOverflowMenu>) => {
  return renderWithProviders(
    <MemoryRouter>
      <RobotOverflowMenu {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('RobotOverflowMenu', () => {
  let props: React.ComponentProps<typeof RobotOverflowMenu>

  beforeEach(() => {
    props = {
      robot: mockConnectedRobot,
    }
    vi.mocked(useCurrentRunId).mockReturnValue('RUNID')
    vi.mocked(ChooseProtocolSlideout).mockReturnValue(
      <div>choose protocol slideout</div>
    )
    vi.mocked(useIsRobotOnWrongVersionOfSoftware).mockReturnValue(false)
    vi.mocked(useIsRobotBusy).mockReturnValue(false)
  })

  it('renders overflow menu items when the robot is reachable and a run id is present', () => {
    render(props)
    const btn = screen.getByLabelText('RobotOverflowMenu_button')
    fireEvent.click(btn)
    screen.getByRole('link', { name: 'Robot settings' })
  })

  it('renders overflow menu items when the robot is not reachable', () => {
    vi.mocked(useCurrentRunId).mockReturnValue(null)

    props = {
      robot: mockUnreachableRobot,
    }
    render(props)
    const btn = screen.getByLabelText('RobotOverflowMenu_button')
    fireEvent.click(btn)
    screen.getByText('Why is this robot unavailable?')
    screen.getByText('Forget unavailable robot')
  })

  it('disables the run a protocol menu item if robot software update is available', () => {
    vi.mocked(useCurrentRunId).mockReturnValue(null)
    vi.mocked(useIsRobotOnWrongVersionOfSoftware).mockReturnValue(true)
    render(props)
    const btn = screen.getByLabelText('RobotOverflowMenu_button')
    fireEvent.click(btn)
    const run = screen.getByText('Run a protocol')
    expect(run).toBeDisabled()
  })

  it('disables the run a protocol menu item if robot is busy', () => {
    vi.mocked(useCurrentRunId).mockReturnValue(null)
    vi.mocked(useIsRobotBusy).mockReturnValue(true)
    render(props)
    const btn = screen.getByLabelText('RobotOverflowMenu_button')
    fireEvent.click(btn)
    const run = screen.getByText('Run a protocol')
    expect(run).toBeDisabled()
  })
})
