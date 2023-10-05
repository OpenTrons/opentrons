import * as React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { mountWithStore } from '@opentrons/components'
import { useIsRobotBusy } from '../../../hooks'
import * as RobotUpdate from '../../../../../redux/robot-update'

import { RobotUpdateProgressModal } from '../RobotUpdateProgressModal'
import { UpdateRobotModal } from '../UpdateRobotModal'
import { MigrationWarningModal } from '../MigrationWarningModal'
import { ViewUpdateModal } from '../ViewUpdateModal'

import type { State } from '../../../../../redux/types'

jest.mock('../../../../../redux/robot-update')
jest.mock('../../../../../redux/shell')
jest.mock('../../../hooks')

const getRobotUpdateInfo = RobotUpdate.getRobotUpdateInfo as jest.MockedFunction<
  typeof RobotUpdate.getRobotUpdateInfo
>
const getRobotUpdateDownloadProgress = RobotUpdate.getRobotUpdateDownloadProgress as jest.MockedFunction<
  typeof RobotUpdate.getRobotUpdateDownloadProgress
>
const getRobotUpdateDownloadError = RobotUpdate.getRobotUpdateDownloadError as jest.MockedFunction<
  typeof RobotUpdate.getRobotUpdateDownloadError
>
const getRobotUpdateDisplayInfo = RobotUpdate.getRobotUpdateDisplayInfo as jest.MockedFunction<
  typeof RobotUpdate.getRobotUpdateDisplayInfo
>

const mockUseIsRobotBusy = useIsRobotBusy as jest.MockedFunction<
  typeof useIsRobotBusy
>

const MOCK_STATE: State = { mockState: true } as any
const MOCK_ROBOT_NAME = 'robot-name'
const queryClient = new QueryClient()

describe('ViewUpdateModal', () => {
  const handleClose = jest.fn()

  const render = (
    robotUpdateType: React.ComponentProps<
      typeof ViewUpdateModal
    >['robotUpdateType'] = RobotUpdate.UPGRADE,
    robotSystemType: React.ComponentProps<
      typeof ViewUpdateModal
    >['robotSystemType'] = RobotUpdate.OT2_BUILDROOT
  ) => {
    return mountWithStore<React.ComponentProps<typeof ViewUpdateModal>>(
      <QueryClientProvider client={queryClient}>
        <ViewUpdateModal
          robotName={MOCK_ROBOT_NAME}
          robotUpdateType={robotUpdateType}
          robotSystemType={robotSystemType}
          closeModal={handleClose}
        />
      </QueryClientProvider>,
      { initialState: MOCK_STATE }
    )
  }
  beforeEach(() => {
    getRobotUpdateInfo.mockReturnValue(null)
    getRobotUpdateDownloadProgress.mockReturnValue(50)
    getRobotUpdateDownloadError.mockReturnValue(null)
    getRobotUpdateDisplayInfo.mockReturnValue({
      autoUpdateAction: 'upgrade',
      autoUpdateDisabledReason: null,
      updateFromFileDisabledReason: null,
    })
    mockUseIsRobotBusy.mockReturnValue(false)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders a RobotUpdateProgressModal if the update has not completed downloading', () => {
    const { wrapper } = render()
    const robotUpdateProgressModal = wrapper.find(RobotUpdateProgressModal)

    expect(robotUpdateProgressModal.prop('error')).toEqual(null)
    expect(robotUpdateProgressModal.prop('stepProgress')).toEqual(50)
    expect(getRobotUpdateDownloadProgress).toHaveBeenCalledWith(
      MOCK_STATE,
      'robot-name'
    )
  })

  it('should show a RobotUpdateProgressModal if the update download errored out', () => {
    getRobotUpdateDownloadError.mockReturnValue('oh no!')

    const { wrapper } = render()
    const robotUpdateProgressModal = wrapper.find(RobotUpdateProgressModal)

    expect(robotUpdateProgressModal.prop('error')).toEqual('oh no!')
    expect(getRobotUpdateDownloadError).toHaveBeenCalledWith(
      MOCK_STATE,
      'robot-name'
    )
  })

  it('should show a UpdateRobotModal if the update is an upgrade', () => {
    getRobotUpdateInfo.mockReturnValue({
      version: '1.0.0',
      target: 'ot2',
      releaseNotes: 'hey look a release',
    })

    const { wrapper } = render()
    const updateRobotModal = wrapper.find(UpdateRobotModal)

    expect(updateRobotModal.prop('robotName')).toBe(MOCK_ROBOT_NAME)
    expect(updateRobotModal.prop('releaseNotes')).toBe('hey look a release')
    expect(updateRobotModal.prop('systemType')).toBe(RobotUpdate.OT2_BUILDROOT)
    expect(getRobotUpdateInfo).toHaveBeenCalledWith(MOCK_STATE, 'robot-name')
  })

  it('should show a MigrationWarningModal if the robot is on Balena', () => {
    const { wrapper } = render(RobotUpdate.UPGRADE, RobotUpdate.OT2_BALENA)
    const migrationWarning = wrapper.find(MigrationWarningModal)

    expect(migrationWarning.prop('updateType')).toBe(RobotUpdate.UPGRADE)

    const closeButtonProps = migrationWarning.prop('notNowButton')

    expect(closeButtonProps.children).toMatch(/not now/i)
    expect(handleClose).not.toHaveBeenCalled()
    closeButtonProps.onClick?.({} as React.MouseEvent)
    expect(handleClose).toHaveBeenCalled()
  })

  it('should proceed from MigrationWarningModal to release notes if upgrade', () => {
    getRobotUpdateInfo.mockReturnValue({
      version: '1.0.0',
      target: 'ot2',
      releaseNotes: 'hey look a release',
    })

    const { wrapper } = render(RobotUpdate.UPGRADE, RobotUpdate.OT2_BALENA)
    const migrationWarning = wrapper.find(MigrationWarningModal)

    migrationWarning.invoke('proceed')?.()

    expect(wrapper.find(UpdateRobotModal).prop('systemType')).toBe(
      RobotUpdate.OT2_BALENA
    )
  })

  it('should proceed from MigrationWarningModal to RobotUpdateProgressModal if still downloading', () => {
    const { wrapper } = render(RobotUpdate.UPGRADE, RobotUpdate.OT2_BALENA)
    const migrationWarning = wrapper.find(MigrationWarningModal)

    migrationWarning.invoke('proceed')?.()
    expect(wrapper.exists(RobotUpdateProgressModal)).toBe(true)
  })
})
