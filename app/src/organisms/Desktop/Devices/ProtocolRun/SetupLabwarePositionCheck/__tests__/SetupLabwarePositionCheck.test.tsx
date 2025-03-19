import { when } from 'vitest-when'
import { MemoryRouter } from 'react-router-dom'
import { screen, fireEvent } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect, afterEach } from 'vitest'

import {
  useProtocolQuery,
  useProtocolAnalysisAsDocumentQuery,
} from '@opentrons/react-api-client'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { getModuleTypesThatRequireExtraAttention } from '../../utils/getModuleTypesThatRequireExtraAttention'
import { useLaunchLegacyLPC } from '/app/organisms/LegacyLabwarePositionCheck/useLaunchLegacyLPC'
import { getIsLabwareOffsetCodeSnippetsOn } from '/app/redux/config'
import { SetupLabwarePositionCheck } from '..'
import {
  useNotifyRunQuery,
  useRunCalibrationStatus,
  useRunHasStarted,
  useLPCDisabledReason,
  useUnmatchedModulesForProtocol,
} from '/app/resources/runs'
import { useRobotType } from '/app/redux-resources/robots'
import { useLPCFlows } from '/app/organisms/LabwarePositionCheck'

import type { Mock } from 'vitest'

vi.mock('/app/organisms/LegacyLabwarePositionCheck/useLaunchLegacyLPC')
vi.mock('../../utils/getModuleTypesThatRequireExtraAttention')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/redux/config')
vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/runs')
vi.mock('/app/organisms/LabwarePositionCheck')

const DISABLED_REASON = 'MOCK_DISABLED_REASON'
const ROBOT_NAME = 'otie'
const RUN_ID = '1'

const render = () => {
  let areOffsetsConfirmed = false
  const confirmOffsets = vi.fn((offsetsConfirmed: boolean) => {
    areOffsetsConfirmed = offsetsConfirmed
  })
  return renderWithProviders(
    <MemoryRouter>
      <SetupLabwarePositionCheck
        offsetsConfirmed={areOffsetsConfirmed}
        setOffsetsConfirmed={confirmOffsets}
        robotName={ROBOT_NAME}
        runId={RUN_ID}
        isNewLPC={false}
        robotType={FLEX_ROBOT_TYPE}
      />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('SetupLabwarePositionCheck', () => {
  let mockLaunchLPC: Mock

  beforeEach(() => {
    mockLaunchLPC = vi.fn()
    when(vi.mocked(getModuleTypesThatRequireExtraAttention))
      .calledWith(expect.anything())
      .thenReturn([])

    when(vi.mocked(useUnmatchedModulesForProtocol))
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({
        missingModuleIds: [],
        remainingAttachedModules: [],
      })

    when(vi.mocked(useRunCalibrationStatus))
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({
        complete: true,
      })
    when(vi.mocked(useRunHasStarted)).calledWith(RUN_ID).thenReturn(false)
    vi.mocked(getIsLabwareOffsetCodeSnippetsOn).mockReturnValue(false)
    vi.mocked(useLPCDisabledReason).mockReturnValue(null)
    when(vi.mocked(useRobotType))
      .calledWith(ROBOT_NAME)
      .thenReturn(FLEX_ROBOT_TYPE)
    vi.mocked(useLaunchLegacyLPC).mockReturnValue({
      launchLegacyLPC: mockLaunchLPC,
      LegacyLPCWizard: <div>mock LPC Wizard</div>,
    })
    vi.mocked(useNotifyRunQuery).mockReturnValue({
      data: {
        data: { protocolId: 'fakeProtocolId' },
      },
    } as any)
    vi.mocked(useProtocolQuery).mockReturnValue({
      data: { data: { metadata: { protocolName: 'test protocol' } } },
    } as any)
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: null,
    } as any)
    vi.mocked(useLPCFlows).mockReturnValue({ launchLPC: mockLaunchLPC } as any)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render LPC button and clicking should launch modal', () => {
    render()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'run labware position check',
      })
    )
    expect(mockLaunchLPC).toHaveBeenCalled()
  })
  it('should render a disabled LPC button when disabled LPC reason exists', () => {
    when(vi.mocked(useRunHasStarted)).calledWith(RUN_ID).thenReturn(true)
    vi.mocked(useLPCDisabledReason).mockReturnValue(DISABLED_REASON)
    render()
    const button = screen.getByRole('button', {
      name: 'run labware position check',
    })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(screen.queryByText('mock Labware Position Check')).toBeNull()
  })
})
