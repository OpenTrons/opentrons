import * as React from 'react'
import '@testing-library/jest-dom'
import { renderWithProviders } from '@opentrons/components'
import { StaticRouter } from 'react-router-dom'
import { fireEvent } from '@testing-library/react'
import { i18n } from '../../../i18n'
import {
  getConnectableRobots,
  getReachableRobots,
  getScanning,
  getUnreachableRobots,
} from '../../../redux/discovery'
import { getIsProtocolAnalysisInProgress } from '../../../redux/protocol-storage/selectors'
import {
  mockConnectableRobot,
  mockReachableRobot,
  mockUnreachableRobot,
} from '../../../redux/discovery/__fixtures__'
import { storedProtocolData } from '../../../redux/protocol-storage/__fixtures__'
import { ProtocolDetails } from '..'
import { DeckThumbnail } from '../../../molecules/DeckThumbnail'

jest.mock('../../../redux/discovery/selectors')
jest.mock('../../../redux/protocol-storage/selectors')
jest.mock('../../../molecules/DeckThumbnail')

const mockGetConnectableRobots = getConnectableRobots as jest.MockedFunction<
  typeof getConnectableRobots
>
const mockGetReachableRobots = getReachableRobots as jest.MockedFunction<
  typeof getReachableRobots
>
const mockGetUnreachableRobots = getUnreachableRobots as jest.MockedFunction<
  typeof getUnreachableRobots
>
const mockGetScanning = getScanning as jest.MockedFunction<typeof getScanning>
const mockDeckThumbnail = DeckThumbnail as jest.MockedFunction<
  typeof DeckThumbnail
>
const mockGetIsProtocolAnalysisInProgress = getIsProtocolAnalysisInProgress as jest.MockedFunction<
  typeof getIsProtocolAnalysisInProgress
>

const render = (
  props: Partial<React.ComponentProps<typeof ProtocolDetails>> = {}
) => {
  return renderWithProviders(
    <StaticRouter>
      <ProtocolDetails {...{ ...storedProtocolData, ...props }} />
    </StaticRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('ProtocolDetails', () => {
  beforeEach(() => {
    mockGetConnectableRobots.mockReturnValue([mockConnectableRobot])
    mockGetUnreachableRobots.mockReturnValue([mockUnreachableRobot])
    mockGetReachableRobots.mockReturnValue([mockReachableRobot])
    mockGetScanning.mockReturnValue(false)
    mockDeckThumbnail.mockReturnValue(<div>mock Deck Thumbnail</div>)
    mockGetIsProtocolAnalysisInProgress.mockReturnValue(false)
  })
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders protocol title as display name if present in metadata', () => {
    const protocolName = 'fakeProtocolDisplayName'
    const { getByRole } = render({
      mostRecentAnalysis: {
        ...storedProtocolData.mostRecentAnalysis,
        metadata: {
          ...storedProtocolData.mostRecentAnalysis.metadata,
          protocolName,
        },
      },
    })
    getByRole('heading', { name: protocolName })
  })
  it('renders protocol title as file name if not in metadata', () => {
    const { getByRole } = render()
    expect(
      getByRole('heading', { name: 'fakeSrcFileName' })
    ).toBeInTheDocument()
  })
  it('renders deck setup section', () => {
    const { getByRole, getByText } = render()
    expect(getByRole('heading', { name: 'deck setup' })).toBeInTheDocument()
    expect(getByText('mock Deck Thumbnail')).toBeInTheDocument()
  })
  it('opens choose robot slideout when run protocol button is clicked', () => {
    const { getByRole, queryByRole } = render()
    const runProtocolButton = getByRole('button', { name: 'Run protocol' })
    expect(
      queryByRole('heading', { name: 'Choose Robot to Run\nfakeSrcFileName' })
    ).toBeNull()
    fireEvent.click(runProtocolButton)
    expect(
      getByRole('heading', { name: 'Choose Robot to Run\nfakeSrcFileName' })
    ).toBeVisible()
  })
})
