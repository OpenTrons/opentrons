import * as React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { when, resetAllWhenMocks } from 'jest-when'

import { renderWithProviders } from '@opentrons/components'
import { i18n } from '../../../i18n'

import * as Buildroot from '../../../redux/buildroot'
import { getLocalRobot } from '../../../redux/discovery'
import { CheckUpdates } from '../../../organisms/UpdateRobotSoftware/CheckUpdates'
import { CompleteUpdateSoftware } from '../../../organisms/UpdateRobotSoftware/CompleteUpdateSoftware'
import { ErrorUpdateSoftware } from '../../../organisms/UpdateRobotSoftware/ErrorUpdateSoftware'
import { NoUpdateFound } from '../../../organisms/UpdateRobotSoftware/NoUpdateFound'
import { UpdateSoftware } from '../../../organisms/UpdateRobotSoftware/UpdateSoftware'

import { UpdateRobot } from '../UpdateRobot'

import type { State } from '../../../redux/types'

jest.mock('../../../redux/discovery')
jest.mock('../../../redux/buildroot')
jest.mock('../../../organisms/UpdateRobotSoftware/CheckUpdates')
jest.mock('../../../organisms/UpdateRobotSoftware/CompleteUpdateSoftware')
jest.mock('../../../organisms/UpdateRobotSoftware/ErrorUpdateSoftware')
jest.mock('../../../organisms/UpdateRobotSoftware/NoUpdateFound')
jest.mock('../../../organisms/UpdateRobotSoftware/UpdateSoftware')

const mockCheckUpdates = CheckUpdates as jest.MockedFunction<
  typeof CheckUpdates
>
const mockCompleteUpdateSoftware = CompleteUpdateSoftware as jest.MockedFunction<
  typeof CompleteUpdateSoftware
>
const mockErrorUpdateSoftware = ErrorUpdateSoftware as jest.MockedFunction<
  typeof ErrorUpdateSoftware
>
const mockNoUpdateFound = NoUpdateFound as jest.MockedFunction<
  typeof NoUpdateFound
>
const mockUpdateSoftware = UpdateSoftware as jest.MockedFunction<
  typeof UpdateSoftware
>
const mockGetBuildrootUpdateAvailable = Buildroot.getBuildrootUpdateAvailable as jest.MockedFunction<
  typeof Buildroot.getBuildrootUpdateAvailable
>
const mockGetBuildrootSession = Buildroot.getBuildrootSession as jest.MockedFunction<
  typeof Buildroot.getBuildrootSession
>
const mockGetLocalRobot = getLocalRobot as jest.MockedFunction<
  typeof getLocalRobot
>

const MOCK_STATE: State = {
  discovery: {
    robot: { connection: { connectedTo: null } },
    robotsByName: {
      oddtie: {
        name: 'oddtie',
        health: null,
        serverHealth: null,
        addresses: [
          {
            ip: '127.0.0.1',
            port: 31950,
            seen: true,
            healthStatus: null,
            serverHealthStatus: null,
            healthError: null,
            serverHealthError: null,
            advertisedModel: null,
          },
        ],
      },
    },
  },
} as any

const mockRobot = {
  name: 'oddtie',
  status: null,
  health: null,
  ip: '127.0.0.1',
  port: 31950,
  healthStatus: null,
  serverHealthStatus: null,
} as any

const mockSession = {
  robotName: mockRobot.name,
  userFileInfo: null,
  token: null,
  pathPrefix: null,
  step: null,
  stage: null,
  progress: null,
  error: null,
}

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <UpdateRobot />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
      initialState: MOCK_STATE,
    }
  )
}

describe('UpdateRobot', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockGetBuildrootUpdateAvailable.mockReturnValue(Buildroot.UPGRADE)
    when(mockGetLocalRobot).calledWith(MOCK_STATE).mockReturnValue(mockRobot)
    mockCheckUpdates.mockReturnValue(<div>mock CheckUpdates</div>)
    mockCompleteUpdateSoftware.mockReturnValue(
      <div>mock CompleteUpdateSoftware</div>
    )
    mockErrorUpdateSoftware.mockReturnValue(<div>mock ErrorUpdateSoftware</div>)
    mockNoUpdateFound.mockReturnValue(<div>mock NoUpdateFound</div>)
    mockUpdateSoftware.mockReturnValue(<div>mock UpdateSoftware</div>)
  })

  afterEach(() => {
    jest.resetAllMocks()
    resetAllWhenMocks()
  })

  it('should render mock CheckUpdates', () => {
    const [{ getByText }] = render()
    getByText('mock CheckUpdates')
  })

  it('mock CheckUpdates should disappear after 10 sec', () => {
    const [{ getByText }] = render()
    const checkUpdates = getByText('mock CheckUpdates')
    jest.advanceTimersByTime(1000)
    expect(checkUpdates).toBeInTheDocument()
    jest.advanceTimersByTime(11000)
    expect(checkUpdates).not.toBeInTheDocument()
  })

  it('should render mock Update Software for downloading', () => {
    const mockDownloadSession = {
      ...mockSession,
      step: Buildroot.RESTART,
    }
    mockGetBuildrootSession.mockReturnValue(mockDownloadSession)
    const [{ getByText }] = render()
    jest.advanceTimersByTime(11000)
    getByText('mock UpdateSoftware')
  })

  it('should render mock Update Software for sending file', () => {
    const mockSendingFileSession = {
      ...mockSession,
      step: Buildroot.GET_TOKEN,
      stage: Buildroot.VALIDATING,
    }
    mockGetBuildrootSession.mockReturnValue(mockSendingFileSession)
    const [{ getByText }] = render()
    jest.advanceTimersByTime(11000)
    getByText('mock UpdateSoftware')
  })

  it('should render mock Update Software for validating', () => {
    const mockValidatingSession = {
      ...mockSession,
      step: Buildroot.PROCESS_FILE,
    }
    mockGetBuildrootSession.mockReturnValue(mockValidatingSession)
    const [{ getByText }] = render()
    jest.advanceTimersByTime(11000)
    getByText('mock UpdateSoftware')
  })

  it('should render mock Update Software for installing', () => {
    const mockInstallingSession = {
      ...mockSession,
      step: Buildroot.COMMIT_UPDATE,
    }
    mockGetBuildrootSession.mockReturnValue(mockInstallingSession)
    const [{ getByText }] = render()
    jest.advanceTimersByTime(11000)
    getByText('mock UpdateSoftware')
  })

  it('should render mock NoUpdate found when there is no upgrade - reinstall', () => {
    mockGetBuildrootUpdateAvailable.mockReturnValue(Buildroot.REINSTALL)
    const [{ getByText }] = render()
    jest.advanceTimersByTime(11000)
    getByText('mock NoUpdateFound')
  })

  it('should render mock NoUpdate found when there is no upgrade - downgrade', () => {
    mockGetBuildrootUpdateAvailable.mockReturnValue(Buildroot.DOWNGRADE)
    const [{ getByText }] = render()
    jest.advanceTimersByTime(11000)
    getByText('mock NoUpdateFound')
  })

  it('should render mock CompleteUpdateSoftware when the step is finished', () => {
    const mockCompleteSession = {
      ...mockSession,
      step: Buildroot.FINISHED,
    }
    mockGetBuildrootSession.mockReturnValue(mockCompleteSession)
    const [{ getByText }] = render()
    jest.advanceTimersByTime(11000)
    getByText('mock CompleteUpdateSoftware')
  })

  it('should render mock ErrorUpdateSoftware when an error occurs', () => {
    const mockErrorSession = {
      ...mockSession,
      error: 'mock error',
    }
    mockGetBuildrootSession.mockReturnValue(mockErrorSession)
    const [{ getByText }] = render()
    jest.advanceTimersByTime(11000)
    getByText('mock ErrorUpdateSoftware')
  })

  it.todo('add test for targetPath in a following PR')
})
