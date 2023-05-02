import * as React from 'react'
import { when, resetAllWhenMocks } from 'jest-when'
import { StaticRouter } from 'react-router-dom'
import { fireEvent } from '@testing-library/react'

import { renderWithProviders } from '@opentrons/components'
import { i18n } from '../../../../../i18n'
import { useLPCSuccessToast } from '../../../hooks/useLPCSuccessToast'
import { getModuleTypesThatRequireExtraAttention } from '../../utils/getModuleTypesThatRequireExtraAttention'
import { useLaunchLPC } from '../../../../LabwarePositionCheck/useLaunchLPC'
import { getIsLabwareOffsetCodeSnippetsOn } from '../../../../../redux/config'
import {
  useLPCDisabledReason,
  useProtocolDetailsForRun,
  useRunCalibrationStatus,
  useRunHasStarted,
  useUnmatchedModulesForProtocol,
} from '../../../hooks'
import { SetupLabwarePositionCheck } from '..'

jest.mock('../../../../LabwarePositionCheck/useLaunchLPC')
jest.mock('../../utils/getModuleTypesThatRequireExtraAttention')
jest.mock('../../../../RunTimeControl/hooks')
jest.mock('../../../../../redux/config')
jest.mock('../../../hooks')
jest.mock('../../../hooks/useLPCSuccessToast')

const mockGetModuleTypesThatRequireExtraAttention = getModuleTypesThatRequireExtraAttention as jest.MockedFunction<
  typeof getModuleTypesThatRequireExtraAttention
>
const mockUseRunHasStarted = useRunHasStarted as jest.MockedFunction<
  typeof useRunHasStarted
>
const mockUseProtocolDetailsForRun = useProtocolDetailsForRun as jest.MockedFunction<
  typeof useProtocolDetailsForRun
>
const mockUseUnmatchedModulesForProtocol = useUnmatchedModulesForProtocol as jest.MockedFunction<
  typeof useUnmatchedModulesForProtocol
>
const mockUseRunCalibrationStatus = useRunCalibrationStatus as jest.MockedFunction<
  typeof useRunCalibrationStatus
>
const mockGetIsLabwareOffsetCodeSnippetsOn = getIsLabwareOffsetCodeSnippetsOn as jest.MockedFunction<
  typeof getIsLabwareOffsetCodeSnippetsOn
>
const mockUseLPCSuccessToast = useLPCSuccessToast as jest.MockedFunction<
  typeof useLPCSuccessToast
>
const mockUseLPCDisabledReason = useLPCDisabledReason as jest.MockedFunction<
  typeof useLPCDisabledReason
>
const mockUseLaunchLPC = useLaunchLPC as jest.MockedFunction<
  typeof useLaunchLPC
>
const DISABLED_REASON = 'MOCK_DISABLED_REASON'
const ROBOT_NAME = 'otie'
const RUN_ID = '1'
const PICKUP_TIP_LABWARE_ID = 'PICKUP_TIP_LABWARE_ID'
const PRIMARY_PIPETTE_ID = 'PRIMARY_PIPETTE_ID'
const PRIMARY_PIPETTE_NAME = 'PRIMARY_PIPETTE_NAME'
const LABWARE_DEF_ID = 'LABWARE_DEF_ID'
const LABWARE_DEF = {
  ordering: [['A1', 'A2']],
  parameters: { isTiprack: true },
}
const mockLabwarePositionCheckStepTipRack = {
  labwareId:
    '1d57fc10-67ad-11ea-9f8b-3b50068bd62d:opentrons/opentrons_96_filtertiprack_200ul/1',
  section: '',
  commands: [
    {
      commandType: 'pickUpTip',
      params: {
        pipetteId: PRIMARY_PIPETTE_ID,
        labwareId: PICKUP_TIP_LABWARE_ID,
      },
    },
  ],
} as any

const render = () => {
  return renderWithProviders(
    <StaticRouter>
      <SetupLabwarePositionCheck
        expandLabwareStep={jest.fn()}
        robotName={ROBOT_NAME}
        runId={RUN_ID}
      />
    </StaticRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('SetupLabware', () => {
  let mockLaunchLPC: jest.Mock

  beforeEach(() => {
    mockLaunchLPC = jest.fn()
    when(mockGetModuleTypesThatRequireExtraAttention)
      .calledWith(expect.anything())
      .mockReturnValue([])

    when(mockUseUnmatchedModulesForProtocol)
      .calledWith(ROBOT_NAME, RUN_ID)
      .mockReturnValue({
        missingModuleIds: [],
        remainingAttachedModules: [],
      })

    when(mockUseLPCSuccessToast)
      .calledWith()
      .mockReturnValue({ setIsShowingLPCSuccessToast: jest.fn() })

    when(mockUseRunCalibrationStatus)
      .calledWith(ROBOT_NAME, RUN_ID)
      .mockReturnValue({
        complete: true,
      })
    when(mockUseRunHasStarted).calledWith(RUN_ID).mockReturnValue(false)
    when(mockUseProtocolDetailsForRun)
      .calledWith(RUN_ID)
      .mockReturnValue({
        protocolData: {
          labware: {
            [mockLabwarePositionCheckStepTipRack.labwareId]: {
              slot: '1',
              displayName: 'someDisplayName',
              definitionId: LABWARE_DEF_ID,
            },
          },
          labwareDefinitions: {
            [LABWARE_DEF_ID]: LABWARE_DEF,
          },
          pipettes: {
            [PRIMARY_PIPETTE_ID]: {
              name: PRIMARY_PIPETTE_NAME,
              mount: 'left',
            },
          },
          commands: [
            {
              commandType: 'pickUpTip',
              params: { pipetteId: PRIMARY_PIPETTE_ID },
            } as any,
          ],
        },
      } as any)
    when(mockGetIsLabwareOffsetCodeSnippetsOn).mockReturnValue(false)
    when(mockUseLPCDisabledReason).mockReturnValue(null)
    when(mockUseLaunchLPC)
      .calledWith(RUN_ID)
      .mockReturnValue({
        launchLPC: mockLaunchLPC,
        LPCWizard: <div>mock LPC Wizard</div>,
      })
  })

  afterEach(() => {
    resetAllWhenMocks()
  })

  it('should render LPC button and clicking should launch modal', () => {
    const { getByRole } = render()
    getByRole('button', {
      name: 'run labware position check',
    }).click()
    expect(mockLaunchLPC).toHaveBeenCalled()
  })
  it('should render a disabled LPC button when a run has started', () => {
    when(mockUseRunHasStarted).calledWith(RUN_ID).mockReturnValue(true)
    when(mockUseLPCDisabledReason).mockReturnValue(DISABLED_REASON)
    const { getByRole, queryByText } = render()
    const button = getByRole('button', {
      name: 'run labware position check',
    })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(queryByText('mock Labware Position Check')).toBeNull()
  })

  it('should close Labware Offset Success toast when LPC is launched', () => {
    const mockSetIsShowingLPCSuccessToast = jest.fn()
    when(mockUseLPCSuccessToast).calledWith().mockReturnValue({
      setIsShowingLPCSuccessToast: mockSetIsShowingLPCSuccessToast,
    })
    const { getByRole } = render()
    const button = getByRole('button', {
      name: 'run labware position check',
    })
    fireEvent.click(button)
    expect(mockSetIsShowingLPCSuccessToast).toHaveBeenCalledWith(false)
  })
  it('should render a disabled LPC button when a robot-side protocol analysis is not complete', () => {
    when(mockUseProtocolDetailsForRun)
      .calledWith(RUN_ID)
      .mockReturnValue({
        protocolData: null,
      } as any)
    when(mockUseLPCDisabledReason).mockReturnValue(DISABLED_REASON)
    const { getByRole } = render()
    const button = getByRole('button', {
      name: 'run labware position check',
    })
    expect(button).toBeDisabled()
  })
  it('should render a disabled LPC button when a protocol without a pipette AND without a labware is uploaded', () => {
    when(mockUseProtocolDetailsForRun)
      .calledWith(RUN_ID)
      .mockReturnValue({
        protocolData: { labware: {}, pipettes: {} },
      } as any)
    when(mockUseLPCDisabledReason).mockReturnValue(DISABLED_REASON)
    const { getByRole } = render()
    const button = getByRole('button', {
      name: 'run labware position check',
    })
    expect(button).toBeDisabled()
  })
  it('should render a disabled LPC button when robot calibration is incomplete', () => {
    when(mockUseRunCalibrationStatus)
      .calledWith(ROBOT_NAME, RUN_ID)
      .mockReturnValue({
        complete: false,
      })
    when(mockUseLPCDisabledReason).mockReturnValue(DISABLED_REASON)
    const { getByRole } = render()
    const button = getByRole('button', {
      name: 'run labware position check',
    })
    expect(button).toBeDisabled()
  })
  it('should render a disabled LPC button when modules are not connected', () => {
    when(mockUseUnmatchedModulesForProtocol)
      .calledWith(ROBOT_NAME, RUN_ID)
      .mockReturnValue({
        missingModuleIds: ['temperatureModuleV1'],
        remainingAttachedModules: [],
      })
    when(mockUseLPCDisabledReason).mockReturnValue(DISABLED_REASON)
    const { getByRole } = render()
    const button = getByRole('button', {
      name: 'run labware position check',
    })
    expect(button).toBeDisabled()
  })
  it('should render a disabled LPC button when modules are not connected and robot calibration is incomplete', () => {
    when(mockUseRunCalibrationStatus)
      .calledWith(ROBOT_NAME, RUN_ID)
      .mockReturnValue({
        complete: false,
      })
    when(mockUseUnmatchedModulesForProtocol)
      .calledWith(ROBOT_NAME, RUN_ID)
      .mockReturnValue({
        missingModuleIds: ['temperatureModuleV1'],
        remainingAttachedModules: [],
      })
    when(mockUseLPCDisabledReason).mockReturnValue(DISABLED_REASON)
    const { getByRole } = render()
    const button = getByRole('button', {
      name: 'run labware position check',
    })
    expect(button).toBeDisabled()
  })
  it('should render a disabled LPC button when a protocol does not load a tip rack', () => {
    when(mockUseProtocolDetailsForRun)
      .calledWith(RUN_ID)
      .mockReturnValue({
        protocolData: {
          labware: {
            'labware-0': {
              slot: '1',
              displayName: 'someDisplayName',
              definitionId: LABWARE_DEF_ID,
            },
          },
          labwareDefinitions: {
            [LABWARE_DEF_ID]: { parameters: { isTiprack: false } },
          },
          pipettes: {
            [PRIMARY_PIPETTE_ID]: {
              name: PRIMARY_PIPETTE_NAME,
              mount: 'left',
            },
          },
        },
      } as any)
    when(mockUseLPCDisabledReason).mockReturnValue(DISABLED_REASON)
    const { getByRole } = render()
    const button = getByRole('button', {
      name: 'run labware position check',
    })
    expect(button).toBeDisabled()
  })
  it('should render a disabled LPC button when a protocol does not include a pickUpTip', () => {
    when(mockUseProtocolDetailsForRun)
      .calledWith(RUN_ID)
      .mockReturnValue({
        protocolData: {
          labware: {
            [mockLabwarePositionCheckStepTipRack.labwareId]: {
              slot: '1',
              displayName: 'someDisplayName',
              definitionId: LABWARE_DEF_ID,
            },
          },
          labwareDefinitions: {
            [LABWARE_DEF_ID]: LABWARE_DEF,
          },
          pipettes: {
            [PRIMARY_PIPETTE_ID]: {
              name: PRIMARY_PIPETTE_NAME,
              mount: 'left',
            },
          },
          commands: [],
        },
      } as any)
    when(mockUseLPCDisabledReason).mockReturnValue(DISABLED_REASON)
    const { getByRole } = render()
    const button = getByRole('button', {
      name: 'run labware position check',
    })
    expect(button).toBeDisabled()
  })
})
