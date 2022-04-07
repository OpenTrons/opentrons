import * as React from 'react'
import { when, resetAllWhenMocks } from 'jest-when'

import { RUN_STATUS_IDLE, RUN_STATUS_RUNNING } from '@opentrons/api-client'
import {
  renderWithProviders,
  useConditionalConfirm,
} from '@opentrons/components'
import fixture_tiprack_300_ul from '@opentrons/shared-data/labware/fixtures/2/fixture_tiprack_300_ul.json'

import { i18n } from '../../../../i18n'
import { AskForCalibrationBlockModal } from '../../../../organisms/CalibrateTipLength/AskForCalibrationBlockModal'
import { useRunStatus } from '../../../../organisms/RunTimeControl/hooks'
import { mockDeckCalData } from '../../../../redux/calibration/__fixtures__'
import { getHasCalibrationBlock } from '../../../../redux/config'
import { useDeckCalibrationData } from '../../hooks'
import { SetupTipLengthCalibrationButton } from '../SetupTipLengthCalibrationButton'

import type { LabwareDefinition2 } from '@opentrons/shared-data'

jest.mock('@opentrons/components/src/hooks')
jest.mock(
  '../../../../organisms/CalibrateTipLength/AskForCalibrationBlockModal'
)
jest.mock('../../../../organisms/RunTimeControl/hooks')
jest.mock('../../../../redux/config/selectors')
jest.mock('../../../../redux/sessions/selectors')
jest.mock('../../hooks')

const mockUseConditionalConfirm = useConditionalConfirm as jest.MockedFunction<
  typeof useConditionalConfirm
>
const mockUseRunStatus = useRunStatus as jest.MockedFunction<
  typeof useRunStatus
>
const mockGetHasCalibrationBlock = getHasCalibrationBlock as jest.MockedFunction<
  typeof getHasCalibrationBlock
>
const mockAskForCalibrationBlockModal = AskForCalibrationBlockModal as jest.MockedFunction<
  typeof AskForCalibrationBlockModal
>
const mockUseDeckCalibrationData = useDeckCalibrationData as jest.MockedFunction<
  typeof useDeckCalibrationData
>

const mockConfirm = jest.fn()
const mockCancel = jest.fn()

const ROBOT_NAME = 'otie'
const RUN_ID = '1'

describe('SetupTipLengthCalibrationButton', () => {
  const render = ({
    mount = 'left',
    disabled = false,
    robotName = ROBOT_NAME,
    runId = RUN_ID,
    hasCalibrated = false,
    tipRackDefinition = fixture_tiprack_300_ul as LabwareDefinition2,
    isExtendedPipOffset = false,
  }: Partial<
    React.ComponentProps<typeof SetupTipLengthCalibrationButton>
  > = {}) => {
    return renderWithProviders(
      <SetupTipLengthCalibrationButton
        {...{
          mount,
          disabled,
          robotName,
          runId,
          hasCalibrated,
          tipRackDefinition,
          isExtendedPipOffset,
        }}
      />,
      { i18nInstance: i18n }
    )[0]
  }

  beforeEach(() => {
    when(mockUseRunStatus).mockReturnValue(RUN_STATUS_IDLE)
    when(mockUseConditionalConfirm).mockReturnValue({
      confirm: mockConfirm,
      showConfirmation: true,
      cancel: mockCancel,
    })
    when(mockGetHasCalibrationBlock).mockReturnValue(null)
    when(mockAskForCalibrationBlockModal).mockReturnValue(
      <div>Mock AskForCalibrationBlockModal</div>
    )
    when(mockUseDeckCalibrationData).calledWith(ROBOT_NAME).mockReturnValue({
      deckCalibrationData: mockDeckCalData,
      isDeckCalibrated: true,
    })
  })

  afterEach(() => {
    resetAllWhenMocks()
    jest.resetAllMocks()
  })

  it('renders the calibrate now button if tip length not calibrated', () => {
    const { getByRole } = render()
    expect(getByRole('button', { name: 'Calibrate Now' })).toBeTruthy()
  })

  it('renders the recalibrate link if tip length calibrated and run unstarted', () => {
    const { getByText } = render({ hasCalibrated: true })
    const recalibrate = getByText('Recalibrate')
    recalibrate.click()
    expect(mockConfirm).toBeCalled()
  })

  it('disables the recalibrate link if tip length calibrated and run started', () => {
    when(mockUseRunStatus).mockReturnValue(RUN_STATUS_RUNNING)
    const { getByText } = render({ hasCalibrated: true })
    const recalibrate = getByText('Recalibrate')
    recalibrate.click()
    expect(mockConfirm).not.toBeCalled()
  })
})
