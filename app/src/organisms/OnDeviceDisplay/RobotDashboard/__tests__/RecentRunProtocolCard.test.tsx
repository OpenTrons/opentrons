import * as React from 'react'
import { fireEvent } from '@testing-library/react'
import { formatDistance } from 'date-fns'
import { when, resetAllWhenMocks } from 'jest-when'
import { MemoryRouter } from 'react-router-dom'

import { useProtocolQuery } from '@opentrons/react-api-client'
import { RUN_STATUS_FAILED } from '@opentrons/api-client'
import { COLORS, renderWithProviders } from '@opentrons/components'

import { i18n } from '../../../../i18n'
import { Skeleton } from '../../../../atoms/Skeleton'
import { useMissingProtocolHardware } from '../../../../pages/Protocols/hooks'
import {
  INIT_STATUS,
  useTrackProtocolRunEvent,
  useRobotInitializationStatus,
} from '../../../Devices/hooks'
import { useTrackEvent } from '../../../../redux/analytics'
import { useCloneRun } from '../../../ProtocolUpload/hooks'
import { useHardwareStatusText } from '../hooks'
import { RecentRunProtocolCard } from '../'
import { useNotifyAllRunsQuery } from '../../../../resources/runs/useNotifyAllRunsQuery'

import type { ProtocolHardware } from '../../../../pages/Protocols/hooks'

jest.mock('@opentrons/react-api-client')
jest.mock('../../../../atoms/Skeleton')
jest.mock('../../../../pages/Protocols/hooks')
jest.mock('../../../../organisms/Devices/hooks')
jest.mock('../../../../organisms/RunTimeControl/hooks')
jest.mock('../../../../organisms/ProtocolUpload/hooks')
jest.mock('../../../../redux/analytics')
jest.mock('../hooks')
jest.mock('../../../../resources/runs/useNotifyAllRunsQuery')

const RUN_ID = 'mockRunId'

const mockMissingPipette = [
  {
    hardwareType: 'pipette',
    pipetteName: 'p1000_single_flex',
    mount: 'left',
    connected: false,
  },
] as ProtocolHardware[]

const mockMissingModule = [
  {
    hardwareType: 'module',
    moduleModel: 'temperatureModuleV2',
    slot: '1',
    connected: false,
  },
] as ProtocolHardware[]

const missingBoth = [
  {
    hardwareType: 'pipette',
    pipetteName: 'p1000_single_flex',
    mount: 'left',
    connected: false,
  },
  {
    hardwareType: 'module',
    moduleModel: 'temperatureModuleV2',
    slot: '1',
    connected: false,
  },
] as ProtocolHardware[]

const mockRunData = {
  id: RUN_ID,
  createdAt: '2022-05-03T21:36:12.494778+00:00',
  completedAt: 'thistime',
  startedAt: 'thistime',
  protocolId: 'mockProtocolId',
  status: RUN_STATUS_FAILED,
} as any

let mockCloneRun: jest.Mock

const mockUseMissingProtocolHardware = useMissingProtocolHardware as jest.MockedFunction<
  typeof useMissingProtocolHardware
>
const mockUseNotifyAllRunsQuery = useNotifyAllRunsQuery as jest.MockedFunction<
  typeof useNotifyAllRunsQuery
>
const mockUseProtocolQuery = useProtocolQuery as jest.MockedFunction<
  typeof useProtocolQuery
>
const mockUseTrackProtocolRunEvent = useTrackProtocolRunEvent as jest.MockedFunction<
  typeof useTrackProtocolRunEvent
>
const mockUseTrackEvent = useTrackEvent as jest.MockedFunction<
  typeof useTrackEvent
>
const mockUseCloneRun = useCloneRun as jest.MockedFunction<typeof useCloneRun>
const mockUseHardwareStatusText = useHardwareStatusText as jest.MockedFunction<
  typeof useHardwareStatusText
>
const mockSkeleton = Skeleton as jest.MockedFunction<typeof Skeleton>
const mockUseRobotInitializationStatus = useRobotInitializationStatus as jest.MockedFunction<
  typeof useRobotInitializationStatus
>

const render = (props: React.ComponentProps<typeof RecentRunProtocolCard>) => {
  return renderWithProviders(
    <MemoryRouter>
      <RecentRunProtocolCard {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

let mockTrackEvent: jest.Mock
let mockTrackProtocolRunEvent: jest.Mock

describe('RecentRunProtocolCard', () => {
  let props: React.ComponentProps<typeof RecentRunProtocolCard>

  beforeEach(() => {
    props = {
      runData: mockRunData,
    }
    mockTrackEvent = jest.fn()
    mockTrackProtocolRunEvent = jest.fn(
      () => new Promise(resolve => resolve({}))
    )
    mockSkeleton.mockReturnValue(<div>mock Skeleton</div>)
    mockUseHardwareStatusText.mockReturnValue('Ready to run')
    mockUseTrackEvent.mockReturnValue(mockTrackEvent)
    mockUseMissingProtocolHardware.mockReturnValue({
      missingProtocolHardware: [],
      isLoading: false,
      conflictedSlots: [],
    })
    mockUseNotifyAllRunsQuery.mockReturnValue({
      data: { data: [mockRunData] },
    } as any)
    mockUseProtocolQuery.mockReturnValue({
      data: { data: { metadata: { protocolName: 'mockProtocol' } } },
    } as any)
    when(mockUseTrackProtocolRunEvent).calledWith(RUN_ID).mockReturnValue({
      trackProtocolRunEvent: mockTrackProtocolRunEvent,
    })
    mockCloneRun = jest.fn()
    when(mockUseCloneRun)
      .calledWith(RUN_ID, expect.anything())
      .mockReturnValue({ cloneRun: mockCloneRun, isLoading: false })
    mockUseRobotInitializationStatus.mockReturnValue(INIT_STATUS.SUCCEEDED)
  })

  afterEach(() => {
    resetAllWhenMocks()
    jest.clearAllMocks()
  })

  it('should render text', () => {
    const [{ getByText }] = render(props)
    const lastRunTime = formatDistance(
      new Date(mockRunData.createdAt),
      new Date(),
      {
        addSuffix: true,
      }
    ).replace('about ', '')
    getByText('Ready to run')
    getByText('mockProtocol')
    getByText(`Failed ${lastRunTime}`)
  })

  it('should render missing chip when missing a pipette', () => {
    mockUseMissingProtocolHardware.mockReturnValue({
      missingProtocolHardware: mockMissingPipette,
      isLoading: false,
      conflictedSlots: [],
    })
    mockUseHardwareStatusText.mockReturnValue('Missing 1 pipette')
    const [{ getByText }] = render(props)
    getByText('Missing 1 pipette')
  })

  it('should render missing chip when conflicted fixture', () => {
    mockUseMissingProtocolHardware.mockReturnValue({
      missingProtocolHardware: [],
      isLoading: false,
      conflictedSlots: ['cutoutD3'],
    })
    mockUseHardwareStatusText.mockReturnValue('Location conflicts')
    const [{ getByText }] = render(props)
    getByText('Location conflicts')
  })

  it('should render missing chip when missing a module', () => {
    mockUseMissingProtocolHardware.mockReturnValue({
      missingProtocolHardware: mockMissingModule,
      isLoading: false,
      conflictedSlots: [],
    })
    mockUseHardwareStatusText.mockReturnValue('Missing 1 module')
    const [{ getByText }] = render(props)
    getByText('Missing 1 module')
  })

  it('should render missing chip (module and pipette) when missing a pipette and a module', () => {
    mockUseMissingProtocolHardware.mockReturnValue({
      missingProtocolHardware: missingBoth,
      isLoading: false,
      conflictedSlots: [],
    })
    mockUseHardwareStatusText.mockReturnValue('Missing hardware')
    const [{ getByText }] = render(props)
    getByText('Missing hardware')
  })

  it('when tapping a card, mock functions is called and loading state is activated', () => {
    const [{ getByLabelText }] = render(props)
    const button = getByLabelText('RecentRunProtocolCard')
    expect(button).toHaveStyle(`background-color: ${COLORS.green35}`)
    fireEvent.click(button)
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: 'proceedToRun',
      properties: { sourceLocation: 'RecentRunProtocolCard' },
    })
    // TODO(BC, 08/30/23): reintroduce check for tracking when tracking is reintroduced lazily
    // expect(mockTrackProtocolRunEvent).toBeCalledWith({ name: 'runAgain' })
    getByLabelText('icon_ot-spinner')
    expect(button).toHaveStyle(`background-color: ${COLORS.green40}`)
  })

  it('should render the skeleton when react query is loading', () => {
    mockUseProtocolQuery.mockReturnValue({
      isLoading: true,
      data: { data: { metadata: { protocolName: 'mockProtocol' } } },
    } as any)
    const [{ getByText }] = render(props)
    getByText('mock Skeleton')
  })

  it('should render the skeleton when the robot server is initializing', () => {
    mockUseRobotInitializationStatus.mockReturnValue(INIT_STATUS.INITIALIZING)
    const [{ getByText }] = render(props)
    getByText('mock Skeleton')
  })
})
