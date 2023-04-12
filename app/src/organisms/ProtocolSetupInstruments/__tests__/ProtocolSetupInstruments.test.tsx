import * as React from 'react'
import { when, resetAllWhenMocks } from 'jest-when'
import { MemoryRouter } from 'react-router-dom'

import {
  useInstrumentsQuery,
  useAllPipetteOffsetCalibrationsQuery,
} from '@opentrons/react-api-client'
import { renderWithProviders } from '@opentrons/components'

import { i18n } from '../../../i18n'
import { useMostRecentCompletedAnalysis } from '../../../organisms/LabwarePositionCheck/useMostRecentCompletedAnalysis'
import { ProtocolSetupInstruments } from '..'
import { mockRecentAnalysis } from '../__fixtures__'

jest.mock('@opentrons/react-api-client')
jest.mock(
  '../../../organisms/LabwarePositionCheck/useMostRecentCompletedAnalysis'
)

const mockUseAllPipetteOffsetCalibrationsQuery = useAllPipetteOffsetCalibrationsQuery as jest.MockedFunction<
  typeof useAllPipetteOffsetCalibrationsQuery
>
const mockUseInstrumentsQuery = useInstrumentsQuery as jest.MockedFunction<
  typeof useInstrumentsQuery
>
const mockUseMostRecentCompletedAnalysis = useMostRecentCompletedAnalysis as jest.MockedFunction<
  typeof useMostRecentCompletedAnalysis
>

const mockGripperData = {
  instrumentModel: 'gripper_v1',
  instrumentType: 'gripper',
  mount: 'extension',
  serialNumber: 'ghi789',
}
const mockRightPipetteData = {
  instrumentModel: 'p300_single_v2',
  instrumentType: 'p300',
  mount: 'right',
  serialNumber: 'abc123',
}
const mockLeftPipetteData = {
  instrumentModel: 'p1000_single_v2',
  instrumentType: 'p1000',
  mount: 'left',
  serialNumber: 'def456',
}

const RUN_ID = "otie's run"
const mockSetSetupScreen = jest.fn()
const mockCreateLiveCommand = jest.fn()

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <ProtocolSetupInstruments
        runId={RUN_ID}
        setSetupScreen={mockSetSetupScreen}
      />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('ProtocolSetupInstruments', () => {
  beforeEach(() => {
    mockCreateLiveCommand.mockResolvedValue(null)
    when(mockUseAllPipetteOffsetCalibrationsQuery)
      .calledWith()
      .mockReturnValue({ data: { data: [] } } as any)
    when(mockUseMostRecentCompletedAnalysis)
      .calledWith(RUN_ID)
      .mockReturnValue(mockRecentAnalysis)
    mockUseInstrumentsQuery.mockReturnValue({
      data: {
        data: [mockLeftPipetteData, mockRightPipetteData, mockGripperData],
      },
    } as any)
  })
  afterEach(() => {
    jest.resetAllMocks()
    resetAllWhenMocks()
  })

  it('renders the Instruments Setup page', () => {
    const [{ getByText, getByRole }] = render()
    getByText('Instruments')
    getByText('Location')
    getByText('calibration status')
    getByRole('button', { name: 'continue' })
  })

  it('correctly navigates with the nav buttons', () => {
    const [{ getByRole, getAllByRole }] = render()
    getByRole('button', { name: 'continue' }).click()
    expect(mockSetSetupScreen).toHaveBeenCalledWith('modules')
    getAllByRole('button')[0].click()
    expect(mockSetSetupScreen).toHaveBeenCalledWith('prepare to run')
  })
})
