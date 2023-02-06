import * as React from 'react'
import { when } from 'jest-when'
import { fireEvent, screen } from '@testing-library/react'
import { saveAs } from 'file-saver'
import { OT3_PIPETTES } from '@opentrons/shared-data'
import { renderWithProviders, Mount } from '@opentrons/components'
import { useDeleteCalibrationMutation } from '@opentrons/react-api-client'

import { i18n } from '../../../../i18n'
import { mockDeckCalData } from '../../../../redux/calibration/__fixtures__'
import { useFeatureFlag } from '../../../../redux/config'
import { PipetteWizardFlows } from '../../../PipetteWizardFlows'
import { useCalibratePipetteOffset } from '../../../CalibratePipetteOffset/useCalibratePipetteOffset'
import {
  useDeckCalibrationData,
  useRunStatuses,
  useTipLengthCalibrations,
  usePipetteOffsetCalibrations,
} from '../../../../organisms/Devices/hooks'

import { OverflowMenu } from '../OverflowMenu'
import {
  mockPipetteOffsetCalibrationsResponse,
  mockTipLengthCalibrationResponse,
} from '../__fixtures__'

const render = (
  props: React.ComponentProps<typeof OverflowMenu>
): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<OverflowMenu {...props} />, {
    i18nInstance: i18n,
  })
}

const ROBOT_NAME = 'otie'
const CAL_TYPE = 'pipetteOffset'
const PIPETTE_NAME = 'pipetteName'
const OT3_PIPETTE_NAME = OT3_PIPETTES[0]

const startCalibration = jest.fn()
jest.mock('file-saver')
jest.mock('@opentrons/react-api-client')
jest.mock('../../../../redux/config')
jest.mock('../../../../redux/sessions/selectors')
jest.mock('../../../../redux/discovery')
jest.mock('../../../../redux/robot-api/selectors')
jest.mock(
  '../../../../organisms/CalibratePipetteOffset/useCalibratePipetteOffset'
)
jest.mock('../../../../organisms/ProtocolUpload/hooks')
jest.mock('../../../../organisms/Devices/hooks')
jest.mock('../../../PipetteWizardFlows')

const mockPipetteWizardFlow = PipetteWizardFlows as jest.MockedFunction<
  typeof PipetteWizardFlows
>
const mockUseCalibratePipetteOffset = useCalibratePipetteOffset as jest.MockedFunction<
  typeof useCalibratePipetteOffset
>
const mockUseDeckCalibrationData = useDeckCalibrationData as jest.MockedFunction<
  typeof useDeckCalibrationData
>
const mockUsePipetteOffsetCalibrations = usePipetteOffsetCalibrations as jest.MockedFunction<
  typeof usePipetteOffsetCalibrations
>
const mockUseTipLengthCalibrations = useTipLengthCalibrations as jest.MockedFunction<
  typeof useTipLengthCalibrations
>
const mockUseFeatureFlag = useFeatureFlag as jest.MockedFunction<
  typeof useFeatureFlag
>
const mockUseRunStatuses = useRunStatuses as jest.MockedFunction<
  typeof useRunStatuses
>

const mockUseDeleteCalibrationMutation = useDeleteCalibrationMutation as jest.MockedFunction<
  typeof useDeleteCalibrationMutation
>

const RUN_STATUSES = {
  isRunRunning: false,
  isRunStill: false,
  isRunTerminal: false,
  isRunIdle: false,
}

const mockUpdateRobotStatus = jest.fn()

describe('OverflowMenu', () => {
  let props: React.ComponentProps<typeof OverflowMenu>
  const mockDeleteCalibration = jest.fn()

  beforeEach(() => {
    props = {
      calType: CAL_TYPE,
      robotName: ROBOT_NAME,
      mount: 'left' as Mount,
      serialNumber: 'serialNumber',
      updateRobotStatus: mockUpdateRobotStatus,
      pipetteName: PIPETTE_NAME,
    }
    mockUseCalibratePipetteOffset.mockReturnValue([startCalibration, null])
    mockUseRunStatuses.mockReturnValue(RUN_STATUSES)
    mockUseDeckCalibrationData.mockReturnValue({
      isDeckCalibrated: true,
      deckCalibrationData: mockDeckCalData,
    })
    mockUseDeleteCalibrationMutation.mockReturnValue({
      deleteCalibration: mockDeleteCalibration,
    } as any)
    when(mockUseFeatureFlag)
      .calledWith('enableCalibrationWizards')
      .mockReturnValue(false)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should render Overflow menu buttons - pipette offset calibrations', () => {
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    getByText('Calibrate Pipette Offset')
    getByText('Download calibration data')
    getByText('Delete calibration data')
  })

  it('download pipette offset calibrations data', async () => {
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    const downloadButton = getByText('Download calibration data')
    fireEvent.click(downloadButton)
    expect(saveAs).toHaveBeenCalled()
  })

  it('should call pipette offset calibration when clicking calibrate button', () => {
    const startCalibration = jest.fn()
    mockUseCalibratePipetteOffset.mockReturnValue([startCalibration, null])
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    const calibrationButton = getByText('Calibrate Pipette Offset')
    fireEvent.click(calibrationButton)
    expect(startCalibration).toHaveBeenCalled()
  })

  it('should close the overflow menu when clicking it again', () => {
    const [{ getByLabelText, queryByText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    fireEvent.click(button)
    expect(queryByText('Recalibrate Pipette Offset')).not.toBeInTheDocument()
    expect(queryByText('Download calibration data')).not.toBeInTheDocument()
  })

  it('should render Overflow menu buttons - tip length calibrations', () => {
    props = {
      ...props,
      calType: 'tipLength',
    }
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    getByText('Recalibrate Tip Length and Pipette Offset')
    getByText('Download calibration data')
    getByText('Delete calibration data')
  })

  it('should not render Overflow tip length calibration button when the calibration wizard feature flag is set and no calibration exists', () => {
    mockUseFeatureFlag.mockReturnValue(true)
    const [{ getByLabelText, queryByText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    expect(queryByText('Calibrate Pipette Offset')).not.toBeInTheDocument()
  })

  it('should not render Overflow tip length recalibration button when the calibration wizard feature flag is set', () => {
    props = {
      ...props,
      calType: 'tipLength',
    }
    mockUseFeatureFlag.mockReturnValue(true)
    const [{ getByLabelText, queryByText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    expect(
      queryByText('Recalibrate Tip Length and Pipette Offset')
    ).not.toBeInTheDocument()
  })

  it('should not render calibrate menu item when mount is undefined', () => {
    props = {
      ...props,
      mount: undefined as any,
    }
    const [{ getByRole, queryByRole }] = render(props)
    const button = getByRole('button', {
      name: 'CalibrationOverflowMenu_button',
    })
    fireEvent.click(button)
    const menuItem = queryByRole('button', { name: 'Calibrate Pipette Offset' })
    expect(menuItem).not.toBeInTheDocument()
  })

  it('call a function when clicking download tip length calibrations data', async () => {
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    const downloadButton = getByText('Download calibration data')
    fireEvent.click(downloadButton)
    expect(saveAs).toHaveBeenCalled()
  })

  it('should call pipette offset calibration and tip length calibration when clicking calibrate button', () => {
    props = {
      ...props,
      calType: 'tipLength',
    }
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    const calibrationButton = getByText(
      'Recalibrate Tip Length and Pipette Offset'
    )
    fireEvent.click(calibrationButton)
    expect(startCalibration).toHaveBeenCalled()
  })

  it('calibration button should be disabled if a protocol is running - pipette offset', () => {
    mockUseRunStatuses.mockReturnValue({ ...RUN_STATUSES, isRunRunning: true })
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    const calibrationButton = getByText('Calibrate Pipette Offset')
    expect(calibrationButton).toBeDisabled()
  })

  it('calibration button should be disabled if a protocol is running - tip length', () => {
    props = {
      ...props,
      calType: 'tipLength',
    }
    mockUseRunStatuses.mockReturnValue({ ...RUN_STATUSES, isRunRunning: true })
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    const calibrationButton = getByText(
      'Recalibrate Tip Length and Pipette Offset'
    )
    expect(calibrationButton).toBeDisabled()
  })

  it('calibration button should open up the pipette wizard flow for gen3 pipettes', () => {
    mockPipetteWizardFlow.mockReturnValue(<div>mock pipette wizard flows</div>)
    props = {
      ...props,
      pipetteName: OT3_PIPETTE_NAME,
    }
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    const cal = getByText('Calibrate Pipette Offset')
    expect(
      screen.queryByText('Download calibration data')
    ).not.toBeInTheDocument()
    fireEvent.click(cal)
    getByText('mock pipette wizard flows')
  })

  it('deletes calibration data when delete button is clicked - pipette offset', () => {
    const expectedCallParams = {
      calType: CAL_TYPE,
      mount: 'left',
      pipette_id: mockPipetteOffsetCalibrationsResponse.pipette,
    }
    mockUsePipetteOffsetCalibrations.mockReturnValue([
      mockPipetteOffsetCalibrationsResponse,
    ])
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    const deleteBtn = getByText('Delete calibration data')
    fireEvent.click(deleteBtn)
    expect(mockDeleteCalibration).toHaveBeenCalledWith(expectedCallParams)
  })

  it('deletes calibration data when delete button is clicked - tip length', () => {
    props = {
      ...props,
      calType: 'tipLength',
      tiprackDefURI: mockTipLengthCalibrationResponse.uri,
    }
    const expectedCallParams = {
      calType: 'tipLength',
      tiprack_hash: mockTipLengthCalibrationResponse.tiprack,
      pipette_id: mockTipLengthCalibrationResponse.pipette,
    }
    mockUseTipLengthCalibrations.mockReturnValue([
      mockTipLengthCalibrationResponse,
    ])
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    const deleteBtn = getByText('Delete calibration data')
    fireEvent.click(deleteBtn)
    expect(mockDeleteCalibration).toHaveBeenCalledWith(expectedCallParams)
  })

  it('does nothing when delete is clicked and there is no matching calibration data to delete - pipette offset', () => {
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    const deleteBtn = getByText('Delete calibration data')
    fireEvent.click(deleteBtn)
    expect(mockDeleteCalibration).toHaveBeenCalledTimes(0)
  })

  it('does nothing when delete is clicked and there is no matching calibration data to delete - tip length', () => {
    props = {
      ...props,
      calType: 'tipLength',
    }
    const [{ getByText, getByLabelText }] = render(props)
    const button = getByLabelText('CalibrationOverflowMenu_button')
    fireEvent.click(button)
    const deleteBtn = getByText('Delete calibration data')
    fireEvent.click(deleteBtn)
    expect(mockDeleteCalibration).toHaveBeenCalledTimes(0)
  })
})
