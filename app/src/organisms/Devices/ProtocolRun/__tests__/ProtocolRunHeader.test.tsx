import * as React from 'react'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import { fireEvent } from '@testing-library/react'
import { when, resetAllWhenMocks } from 'jest-when'
import {
  RUN_STATUS_IDLE,
  RUN_STATUS_RUNNING,
  RUN_STATUS_PAUSED,
  RUN_STATUS_PAUSE_REQUESTED,
  RUN_STATUS_STOP_REQUESTED,
  RUN_STATUS_STOPPED,
  RUN_STATUS_FAILED,
  RUN_STATUS_SUCCEEDED,
  RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
} from '@opentrons/api-client'
import { renderWithProviders } from '@opentrons/components'
import { useRunQuery } from '@opentrons/react-api-client'
import _uncastedSimpleV6Protocol from '@opentrons/shared-data/protocol/fixtures/6/simpleV6.json'

import { i18n } from '../../../../i18n'
import {
  useCloseCurrentRun,
  useCurrentRunId,
} from '../../../../organisms/ProtocolUpload/hooks'
import { ConfirmCancelModal } from '../../../../organisms/RunDetails/ConfirmCancelModal'
import {
  useRunTimestamps,
  useRunControls,
  useRunStatus,
} from '../../../../organisms/RunTimeControl/hooks'
import {
  mockFailedRun,
  mockIdleUnstartedRun,
  mockPausedRun,
  mockPauseRequestedRun,
  mockRunningRun,
  mockStoppedRun,
  mockStopRequestedRun,
  mockSucceededRun,
} from '../../../../organisms/RunTimeControl/__fixtures__'
import { mockHeaterShaker } from '../../../../redux/modules/__fixtures__'
import { useTrackEvent } from '../../../../redux/analytics'
import { getIsHeaterShakerAttached } from '../../../../redux/config'

import {
  useProtocolDetailsForRun,
  useRunCalibrationStatus,
  useRunCreatedAtTimestamp,
  useUnmatchedModulesForProtocol,
  useAttachedModules,
} from '../../hooks'
import { useIsHeaterShakerInProtocol } from '../../ModuleCard/hooks'
import { ConfirmAttachmentModal } from '../../ModuleCard/ConfirmAttachmentModal'
import { formatTimestamp } from '../../utils'
import { ProtocolRunHeader } from '../ProtocolRunHeader'
import { HeaterShakerIsRunningModal } from '../../HeaterShakerIsRunningModal'

import type { UseQueryResult } from 'react-query'
import type { Run } from '@opentrons/api-client'
import type { ProtocolAnalysisFile } from '@opentrons/shared-data'

const mockPush = jest.fn()

jest.mock('react-router-dom', () => {
  const reactRouterDom = jest.requireActual('react-router-dom')
  return {
    ...reactRouterDom,
    useHistory: () => ({ push: mockPush } as any),
  }
})
jest.mock('@opentrons/components', () => {
  const actualComponents = jest.requireActual('@opentrons/components')
  return {
    ...actualComponents,
    Tooltip: jest.fn(({ children }) => <div>{children}</div>),
  }
})
jest.mock('@opentrons/react-api-client')
jest.mock('../../../../organisms/ProtocolUpload/hooks')
jest.mock('../../../../organisms/RunDetails/ConfirmCancelModal')
jest.mock('../../../../organisms/RunTimeControl/hooks')
jest.mock('../../hooks')
jest.mock('../../HeaterShakerIsRunningModal')
jest.mock('../../ModuleCard/ConfirmAttachmentModal')
jest.mock('../../ModuleCard/hooks')
jest.mock('../../../../redux/analytics')
jest.mock('../../../../redux/config')

const mockGetIsHeaterShakerAttached = getIsHeaterShakerAttached as jest.MockedFunction<
  typeof getIsHeaterShakerAttached
>
const mockUseCurrentRunId = useCurrentRunId as jest.MockedFunction<
  typeof useCurrentRunId
>
const mockUseCloseCurrentRun = useCloseCurrentRun as jest.MockedFunction<
  typeof useCloseCurrentRun
>
const mockUseRunTimestamps = useRunTimestamps as jest.MockedFunction<
  typeof useRunTimestamps
>
const mockUseRunControls = useRunControls as jest.MockedFunction<
  typeof useRunControls
>
const mockUseRunStatus = useRunStatus as jest.MockedFunction<
  typeof useRunStatus
>
const mockUseProtocolDetailsForRun = useProtocolDetailsForRun as jest.MockedFunction<
  typeof useProtocolDetailsForRun
>
const mockUseRunQuery = useRunQuery as jest.MockedFunction<typeof useRunQuery>
const mockUseUnmatchedModulesForProtocol = useUnmatchedModulesForProtocol as jest.MockedFunction<
  typeof useUnmatchedModulesForProtocol
>
const mockUseRunCalibrationStatus = useRunCalibrationStatus as jest.MockedFunction<
  typeof useRunCalibrationStatus
>
const mockUseRunCreatedAtTimestamp = useRunCreatedAtTimestamp as jest.MockedFunction<
  typeof useRunCreatedAtTimestamp
>
const mockUseAttachedModules = useAttachedModules as jest.MockedFunction<
  typeof useAttachedModules
>
const mockConfirmCancelModal = ConfirmCancelModal as jest.MockedFunction<
  typeof ConfirmCancelModal
>
const mockMockHeaterShakerIsRunningModal = HeaterShakerIsRunningModal as jest.MockedFunction<
  typeof HeaterShakerIsRunningModal
>
const mockUseIsHeaterShakerInProtocol = useIsHeaterShakerInProtocol as jest.MockedFunction<
  typeof useIsHeaterShakerInProtocol
>
const mockConfirmAttachmentModal = ConfirmAttachmentModal as jest.MockedFunction<
  typeof ConfirmAttachmentModal
>
const mockUseTrackEvent = useTrackEvent as jest.MockedFunction<
  typeof useTrackEvent
>

const ROBOT_NAME = 'otie'
const RUN_ID = '95e67900-bc9f-4fbf-92c6-cc4d7226a51b'
const CREATED_AT = '03/03/2022 19:08:49'
const STARTED_AT = '2022-03-03T19:09:40.620530+00:00'
const COMPLETED_AT = '2022-03-03T19:39:53.620530+00:00'
const PROTOCOL_NAME = 'A Protocol for Otie'

const simpleV6Protocol = (_uncastedSimpleV6Protocol as unknown) as ProtocolAnalysisFile<{}>

const PROTOCOL_DETAILS = {
  displayName: PROTOCOL_NAME,
  protocolData: simpleV6Protocol,
  protocolKey: 'fakeProtocolKey',
}

const mockMovingHeaterShaker = {
  id: 'heatershaker_id',
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  serialNumber: 'jkl123',
  hardwareRevision: 'heatershaker_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_closed',
    speedStatus: 'speeding up',
    temperatureStatus: 'idle',
    currentSpeed: null,
    currentTemperature: null,
    targetSpeed: null,
    targetTemp: null,
    errorDetails: null,
    status: 'idle',
  },
  usbPort: { path: '/dev/ot_module_heatershaker0', port: 1 },
} as any

const render = () => {
  return renderWithProviders(
    <BrowserRouter>
      <ProtocolRunHeader
        protocolRunHeaderRef={null}
        robotName={ROBOT_NAME}
        runId={RUN_ID}
      />
    </BrowserRouter>,
    { i18nInstance: i18n }
  )
}
let mockTrackEvent: jest.Mock
let mockCloseCurrentRun: jest.Mock

describe('ProtocolRunHeader', () => {
  beforeEach(() => {
    mockTrackEvent = jest.fn()
    mockCloseCurrentRun = jest.fn()

    when(mockUseTrackEvent).calledWith().mockReturnValue(mockTrackEvent)
    mockConfirmCancelModal.mockReturnValue(<div>Mock ConfirmCancelModal</div>)
    mockMockHeaterShakerIsRunningModal.mockReturnValue(
      <div>Mock HeaterShakerIsRunningModal</div>
    )
    mockUseAttachedModules.mockReturnValue([])
    mockGetIsHeaterShakerAttached.mockReturnValue(false)
    mockConfirmAttachmentModal.mockReturnValue(
      <div>mock confirm attachment modal</div>
    )
    mockUseIsHeaterShakerInProtocol.mockReturnValue(false)
    when(mockUseCurrentRunId).calledWith().mockReturnValue(RUN_ID)
    when(mockUseCloseCurrentRun).calledWith().mockReturnValue({
      isClosingCurrentRun: false,
      closeCurrentRun: mockCloseCurrentRun,
    })
    when(mockUseRunControls)
      .calledWith(RUN_ID, expect.anything())
      .mockReturnValue({
        play: () => {},
        pause: () => {},
        stop: () => {},
        reset: () => {},
        isPlayRunActionLoading: false,
        isPauseRunActionLoading: false,
        isStopRunActionLoading: false,
        isResetRunLoading: false,
      })
    when(mockUseRunStatus).calledWith(RUN_ID).mockReturnValue(RUN_STATUS_IDLE)
    when(mockUseRunTimestamps).calledWith(RUN_ID).mockReturnValue({
      startedAt: STARTED_AT,
      pausedAt: null,
      stoppedAt: null,
      completedAt: null,
    })
    when(mockUseRunCreatedAtTimestamp)
      .calledWith(RUN_ID)
      .mockReturnValue(CREATED_AT)
    when(mockUseRunQuery)
      .calledWith(RUN_ID)
      .mockReturnValue({
        data: { data: mockIdleUnstartedRun },
      } as UseQueryResult<Run>)
    when(mockUseProtocolDetailsForRun)
      .calledWith(RUN_ID)
      .mockReturnValue(PROTOCOL_DETAILS)
    when(mockUseUnmatchedModulesForProtocol)
      .calledWith(ROBOT_NAME, RUN_ID)
      .mockReturnValue({ missingModuleIds: [], remainingAttachedModules: [] })
    when(mockUseRunCalibrationStatus)
      .calledWith(ROBOT_NAME, RUN_ID)
      .mockReturnValue({ complete: true })
    mockUseAttachedModules.mockReturnValue([mockHeaterShaker])
  })
  afterEach(() => {
    resetAllWhenMocks()
    jest.restoreAllMocks()
  })

  it('renders a protocol name, run record id, status, and run time', () => {
    const [{ getByText }] = render()

    getByText('A Protocol for Otie')
    getByText('Run ID')
    getByText('03/03/2022 19:08:49')
    getByText('Status')
    getByText('Not started')
    getByText('Run Time')
  })

  it('links to a protocol details page', () => {
    const [{ getByRole }] = render()

    const protocolNameLink = getByRole('link', { name: 'A Protocol for Otie' })
    expect(protocolNameLink.getAttribute('href')).toBe(
      `/protocols/${PROTOCOL_DETAILS.protocolKey}`
    )
  })

  it('does not render link to protocol detail page if protocol key is absent', () => {
    when(mockUseProtocolDetailsForRun)
      .calledWith(RUN_ID)
      .mockReturnValue({ ...PROTOCOL_DETAILS, protocolKey: null })
    const [{ queryByRole }] = render()

    expect(queryByRole('link', { name: 'A Protocol for Otie' })).toBeNull()
  })

  it('renders a disabled "Analyzing on robot" button if robot-side analysis is not complete', () => {
    when(mockUseProtocolDetailsForRun).calledWith(RUN_ID).mockReturnValue({
      displayName: null,
      protocolData: null,
      protocolKey: null,
    })

    const [{ getByRole }] = render()

    const button = getByRole('button', { name: 'Analyzing on robot' })
    expect(button).toBeDisabled()
  })

  it('renders a start run button and cancel run button when run is ready to start', () => {
    const [{ getByRole, queryByText, getByText }] = render()

    getByRole('button', { name: 'Start run' })
    queryByText(formatTimestamp(STARTED_AT))
    queryByText('Protocol start')
    queryByText('Protocol end')
    getByRole('button', { name: 'Cancel run' }).click()
    getByText('Mock ConfirmCancelModal')
  })

  it('disables the Start Run button with tooltip if calibration is incomplete', () => {
    when(mockUseRunCalibrationStatus)
      .calledWith(ROBOT_NAME, RUN_ID)
      .mockReturnValue({ complete: false })

    const [{ getByRole, getByText }] = render()

    const button = getByRole('button', { name: 'Start run' })
    expect(button).toBeDisabled()
    getByText('Complete required steps in Setup tab')
  })

  it('disables the Start Run button with tooltip if a module is missing', () => {
    when(mockUseUnmatchedModulesForProtocol)
      .calledWith(ROBOT_NAME, RUN_ID)
      .mockReturnValue({
        missingModuleIds: ['temperatureModuleV1'],
        remainingAttachedModules: [],
      })

    const [{ getByRole, getByText }] = render()
    const button = getByRole('button', { name: 'Start run' })
    expect(button).toBeDisabled()
    getByText('Complete required steps in Setup tab')
  })

  it('renders a pause run button, start time, and end time when run is running', () => {
    when(mockUseRunQuery)
      .calledWith(RUN_ID)
      .mockReturnValue({
        data: { data: mockRunningRun },
      } as UseQueryResult<Run>)
    when(mockUseRunStatus)
      .calledWith(RUN_ID)
      .mockReturnValue(RUN_STATUS_RUNNING)
    const [{ getByRole, getByText }] = render()

    getByRole('button', { name: 'Pause run' })
    getByText(formatTimestamp(STARTED_AT))
    getByText('Protocol start')
    getByText('Protocol end')
  })

  it('renders a cancel run button when running and shows a confirm cancel modal when clicked', () => {
    when(mockUseRunQuery)
      .calledWith(RUN_ID)
      .mockReturnValue({
        data: { data: mockRunningRun },
      } as UseQueryResult<Run>)
    when(mockUseRunStatus)
      .calledWith(RUN_ID)
      .mockReturnValue(RUN_STATUS_RUNNING)
    const [{ getByText, queryByText }] = render()

    expect(queryByText('Mock ConfirmCancelModal')).toBeFalsy()
    const cancelButton = getByText('Cancel run')
    cancelButton.click()
    getByText('Mock ConfirmCancelModal')
  })

  it('renders a Resume Run button and Cancel Run button when paused', () => {
    when(mockUseRunQuery)
      .calledWith(RUN_ID)
      .mockReturnValue({
        data: { data: mockPausedRun },
      } as UseQueryResult<Run>)
    when(mockUseRunStatus).calledWith(RUN_ID).mockReturnValue(RUN_STATUS_PAUSED)

    const [{ getByRole, getByText }] = render()

    getByRole('button', { name: 'Resume run' })
    getByRole('button', { name: 'Cancel run' })
    getByText('Paused')
  })

  it('renders a disabled Resume Run button and when pause requested', () => {
    when(mockUseRunQuery)
      .calledWith(RUN_ID)
      .mockReturnValue({
        data: { data: mockPauseRequestedRun },
      } as UseQueryResult<Run>)
    when(mockUseRunStatus)
      .calledWith(RUN_ID)
      .mockReturnValue(RUN_STATUS_PAUSE_REQUESTED)

    const [{ getByRole, getByText }] = render()

    const button = getByRole('button', { name: 'Resume run' })
    expect(button).toBeDisabled()
    getByRole('button', { name: 'Cancel run' })
    getByText('Pause requested')
  })

  it('renders a disabled Canceling Run button and when stop requested', () => {
    when(mockUseRunQuery)
      .calledWith(RUN_ID)
      .mockReturnValue({
        data: { data: mockStopRequestedRun },
      } as UseQueryResult<Run>)
    when(mockUseRunStatus)
      .calledWith(RUN_ID)
      .mockReturnValue(RUN_STATUS_STOP_REQUESTED)

    const [{ getByRole, getByText }] = render()

    const button = getByRole('button', { name: 'Canceling Run' })
    expect(button).toBeDisabled()
    getByText('Stop requested')
  })

  it('renders a Run Again button and end time when run has stopped', () => {
    when(mockUseRunQuery)
      .calledWith(RUN_ID)
      .mockReturnValue({
        data: { data: mockStoppedRun },
      } as UseQueryResult<Run>)
    when(mockUseRunStatus)
      .calledWith(RUN_ID)
      .mockReturnValue(RUN_STATUS_STOPPED)
    when(mockUseRunTimestamps).calledWith(RUN_ID).mockReturnValue({
      startedAt: STARTED_AT,
      pausedAt: null,
      stoppedAt: null,
      completedAt: COMPLETED_AT,
    })

    const [{ getByText }] = render()

    getByText('Run again')
    getByText('Canceled')
    getByText(formatTimestamp(COMPLETED_AT))
  })

  it('renders a Run Again button and end time when run has failed', () => {
    when(mockUseRunQuery)
      .calledWith(RUN_ID)
      .mockReturnValue({
        data: { data: mockFailedRun },
      } as UseQueryResult<Run>)
    when(mockUseRunStatus).calledWith(RUN_ID).mockReturnValue(RUN_STATUS_FAILED)
    when(mockUseRunTimestamps).calledWith(RUN_ID).mockReturnValue({
      startedAt: STARTED_AT,
      pausedAt: null,
      stoppedAt: null,
      completedAt: COMPLETED_AT,
    })

    const [{ getByText }] = render()

    getByText('Run again')
    getByText('Completed')
    getByText(formatTimestamp(COMPLETED_AT))
  })

  it('renders a Run Again button and end time when run has succeeded', () => {
    when(mockUseRunQuery)
      .calledWith(RUN_ID)
      .mockReturnValue({
        data: { data: mockSucceededRun },
      } as UseQueryResult<Run>)
    when(mockUseRunStatus)
      .calledWith(RUN_ID)
      .mockReturnValue(RUN_STATUS_SUCCEEDED)
    when(mockUseRunTimestamps).calledWith(RUN_ID).mockReturnValue({
      startedAt: STARTED_AT,
      pausedAt: null,
      stoppedAt: null,
      completedAt: COMPLETED_AT,
    })

    const [{ getByText }] = render()

    getByText('Run again')
    getByText('Completed')
    getByText(formatTimestamp(COMPLETED_AT))
  })

  it('disables the Run Again button with tooltip for a completed run if the robot is busy', () => {
    when(mockUseRunQuery)
      .calledWith(RUN_ID)
      .mockReturnValue({
        data: { data: mockSucceededRun },
      } as UseQueryResult<Run>)
    when(mockUseRunStatus)
      .calledWith(RUN_ID)
      .mockReturnValue(RUN_STATUS_SUCCEEDED)
    when(mockUseRunTimestamps).calledWith(RUN_ID).mockReturnValue({
      startedAt: STARTED_AT,
      pausedAt: null,
      stoppedAt: null,
      completedAt: COMPLETED_AT,
    })
    when(mockUseCurrentRunId).calledWith().mockReturnValue('some other run id')

    const [{ getByRole, getByText }] = render()

    const button = getByRole('button', { name: 'Run again' })
    expect(button).toBeDisabled()
    getByText('Robot is busy')
  })

  it('renders an alert when the robot door is open', () => {
    when(mockUseRunStatus)
      .calledWith(RUN_ID)
      .mockReturnValue(RUN_STATUS_BLOCKED_BY_OPEN_DOOR)
    const [{ getByText }] = render()

    getByText('Close robot door to resume run')
  })

  it('renders a clear protocol banner when run has failed', () => {
    when(mockUseRunStatus).calledWith(RUN_ID).mockReturnValue(RUN_STATUS_FAILED)
    const [{ getByTestId, getByText }] = render()

    getByText('Run failed.')
    getByTestId('Banner_close-button').click()
    expect(mockCloseCurrentRun).toBeCalled()
  })

  it('renders a clear protocol banner when run has been canceled', () => {
    when(mockUseRunStatus)
      .calledWith(RUN_ID)
      .mockReturnValue(RUN_STATUS_STOPPED)
    const [{ queryByTestId, getByText }] = render()

    getByText('Run canceled.')
    expect(queryByTestId('Banner_close-button')).not.toBeInTheDocument()
  })

  it('renders a clear protocol banner when run has succeeded', () => {
    when(mockUseRunStatus)
      .calledWith(RUN_ID)
      .mockReturnValue(RUN_STATUS_SUCCEEDED)
    const [{ getByTestId, getByText }] = render()

    getByText('Run completed.')
    getByTestId('Banner_close-button').click()
    expect(mockCloseCurrentRun).toBeCalled()
  })

  it('if a heater shaker is shaking, clicking on start run should render HeaterShakerIsRunningModal', () => {
    mockUseAttachedModules.mockReturnValue([mockMovingHeaterShaker])
    const [{ getByRole, getByText }] = render()
    const button = getByRole('button', { name: 'Start run' })
    fireEvent.click(button)
    getByText('Mock HeaterShakerIsRunningModal')
  })

  it('renders the confirm attachment modal when there is a heater shaker in the protocol and the heater shaker is idle status', () => {
    mockUseAttachedModules.mockReturnValue([mockHeaterShaker])
    mockUseIsHeaterShakerInProtocol.mockReturnValue(true)
    const [{ getByText, getByRole }] = render()

    const button = getByRole('button', { name: 'Start run' })
    fireEvent.click(button)
    getByText('mock confirm attachment modal')
  })

  it('does NOT render confirm attachment modal when the user already confirmed the heater shaker is attached', () => {
    mockGetIsHeaterShakerAttached.mockReturnValue(true)
    mockUseAttachedModules.mockReturnValue([mockHeaterShaker])
    mockUseIsHeaterShakerInProtocol.mockReturnValue(true)
    const [{ getByRole }] = render()
    const button = getByRole('button', { name: 'Start run' })
    fireEvent.click(button)
    expect(mockUseRunControls).toHaveBeenCalled()
  })
})
