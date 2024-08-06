import { vi, it, describe, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import {
  useResumeRunFromRecoveryMutation,
  useStopRunMutation,
  useUpdateErrorRecoveryPolicy,
} from '@opentrons/react-api-client'

import { useChainRunCommands } from '../../../../resources/runs'
import {
  useRecoveryCommands,
  HOME_PIPETTE_Z_AXES,
  buildPickUpTips,
  buildIgnorePolicyRules,
} from '../useRecoveryCommands'
import { RECOVERY_MAP } from '../../constants'

vi.mock('@opentrons/react-api-client')
vi.mock('../../../../resources/runs')

describe('useRecoveryCommands', () => {
  const mockFailedCommand = {
    id: 'MOCK_ID',
    commandType: 'mockCommandType',
    params: { test: 'mock_param' },
  } as any
  const mockRunId = '123'
  const mockFailedLabwareUtils = {
    selectedTipLocations: { A1: null },
    pickUpTipLabware: { id: 'MOCK_LW_ID' },
  } as any
  const mockProceedToRouteAndStep = vi.fn()
  const mockRouteUpdateActions = {
    proceedToRouteAndStep: mockProceedToRouteAndStep,
  } as any
  const mockMakeSuccessToast = vi.fn()
  const mockResumeRunFromRecovery = vi.fn(() =>
    Promise.resolve(mockMakeSuccessToast())
  )
  const mockStopRun = vi.fn()
  const mockChainRunCommands = vi.fn().mockResolvedValue([])
  const mockReportActionSelectedResult = vi.fn()
  const mockReportRecoveredRunResult = vi.fn()
  const mockUpdateErrorRecoveryPolicy = vi.fn()

  const props = {
    runId: mockRunId,
    failedCommand: mockFailedCommand,
    failedLabwareUtils: mockFailedLabwareUtils,
    routeUpdateActions: mockRouteUpdateActions,
    recoveryToastUtils: { makeSuccessToast: mockMakeSuccessToast } as any,
    analytics: {
      reportActionSelectedResult: mockReportActionSelectedResult,
      reportRecoveredRunResult: mockReportRecoveredRunResult,
    } as any,
    selectedRecoveryOption: RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE,
  }

  beforeEach(() => {
    vi.mocked(useResumeRunFromRecoveryMutation).mockReturnValue({
      mutateAsync: mockResumeRunFromRecovery,
    } as any)
    vi.mocked(useStopRunMutation).mockReturnValue({
      stopRun: mockStopRun,
    } as any)
    vi.mocked(useChainRunCommands).mockReturnValue({
      chainRunCommands: mockChainRunCommands,
    } as any)
    vi.mocked(useUpdateErrorRecoveryPolicy).mockReturnValue({
      updateErrorRecoveryPolicy: mockUpdateErrorRecoveryPolicy,
    } as any)
  })

  it('should call chainRunRecoveryCommands with continuePastCommandFailure set to false', async () => {
    const { result } = renderHook(() => useRecoveryCommands(props))

    await act(async () => {
      await result.current.homePipetteZAxes()
    })

    expect(mockChainRunCommands).toHaveBeenCalledWith(
      [HOME_PIPETTE_Z_AXES],
      false
    )
  })

  it(`should call proceedToRouteAndStep with ${RECOVERY_MAP.ERROR_WHILE_RECOVERING.ROUTE} when chainRunCommands throws an error`, async () => {
    const mockError = new Error('Mock error')
    vi.mocked(useChainRunCommands).mockReturnValue({
      chainRunCommands: vi.fn().mockRejectedValue(mockError),
    } as any)

    const { result } = renderHook(() => useRecoveryCommands(props))

    await act(async () => {
      await expect(result.current.homePipetteZAxes()).rejects.toThrow(
        'Could not execute command: Error: Mock error'
      )
    })

    expect(mockProceedToRouteAndStep).toHaveBeenCalledWith(
      RECOVERY_MAP.ERROR_WHILE_RECOVERING.ROUTE
    )
  })

  it('should call retryFailedCommand with the failedCommand', async () => {
    const expectedNewCommand = {
      commandType: mockFailedCommand.commandType,
      params: mockFailedCommand.params,
    }

    const { result } = renderHook(() => useRecoveryCommands(props))

    await act(async () => {
      await result.current.retryFailedCommand()
    })

    expect(mockChainRunCommands).toHaveBeenCalledWith(
      [expectedNewCommand],
      false
    )
  })
  ;([
    'aspirateInPlace',
    'dispenseInPlace',
    'blowOutInPlace',
    'dropTipInPlace',
    'prepareToAspirate',
  ] as const).forEach(inPlaceCommandType => {
    it(`Should move to retryLocation if failed command is ${inPlaceCommandType} and error is appropriate when retrying`, async () => {
      const { result } = renderHook(() =>
        useRecoveryCommands({
          runId: mockRunId,
          failedCommand: {
            ...mockFailedCommand,
            commandType: inPlaceCommandType,
            params: {
              pipetteId: 'mock-pipette-id',
            },
            error: {
              errorType: 'overpressure',
              errorCode: '3006',
              isDefined: true,
              errorInfo: {
                retryLocation: [1, 2, 3],
              },
            },
          },
          failedLabwareUtils: mockFailedLabwareUtils,
          routeUpdateActions: mockRouteUpdateActions,
          recoveryToastUtils: {} as any,
          analytics: {
            reportActionSelectedResult: mockReportActionSelectedResult,
            reportRecoveredRunResult: mockReportRecoveredRunResult,
          } as any,
          selectedRecoveryOption: RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE,
        })
      )
      await act(async () => {
        await result.current.retryFailedCommand()
      })
      expect(mockChainRunCommands).toHaveBeenLastCalledWith(
        [
          {
            commandType: 'moveToCoordinates',
            intent: 'fixit',
            params: {
              pipetteId: 'mock-pipette-id',
              coordinates: { x: 1, y: 2, z: 3 },
            },
          },
          {
            commandType: inPlaceCommandType,
            params: { pipetteId: 'mock-pipette-id' },
          },
        ],
        false
      )
    })
  })

  it('should call resumeRun with runId and show success toast on success', async () => {
    const { result } = renderHook(() => useRecoveryCommands(props))

    await act(async () => {
      await result.current.resumeRun()
    })

    expect(mockResumeRunFromRecovery).toHaveBeenCalledWith(mockRunId)
    expect(mockMakeSuccessToast).toHaveBeenCalled()
  })

  it('should call cancelRun with runId', () => {
    const { result } = renderHook(() => useRecoveryCommands(props))

    result.current.cancelRun()

    expect(mockStopRun).toHaveBeenCalledWith(mockRunId)
  })

  it('should call homePipetteZAxes with the appropriate command', async () => {
    const { result } = renderHook(() => useRecoveryCommands(props))

    await act(async () => {
      await result.current.homePipetteZAxes()
    })

    expect(mockChainRunCommands).toHaveBeenCalledWith(
      [HOME_PIPETTE_Z_AXES],
      false
    )
  })

  it('should call pickUpTips with the appropriate command', async () => {
    const mockFailedCmdWithPipetteId = {
      ...mockFailedCommand,
      params: { ...mockFailedCommand.params, pipetteId: 'MOCK_ID' },
    }

    const mockFailedLabware = {
      id: 'MOCK_LW_ID',
    } as any

    const buildPickUpTipsCmd = buildPickUpTips(
      mockFailedLabwareUtils.selectedTipLocations,
      mockFailedCmdWithPipetteId,
      mockFailedLabware
    )

    const testProps = {
      ...props,
      failedCommand: mockFailedCmdWithPipetteId,
      failedLabwareUtils: {
        ...mockFailedLabwareUtils,
        failedLabware: mockFailedLabware,
      },
    }

    const { result } = renderHook(() => useRecoveryCommands(testProps))

    await act(async () => {
      await result.current.pickUpTips()
    })

    expect(mockChainRunCommands).toHaveBeenCalledWith(
      [buildPickUpTipsCmd],
      false
    )
  })

  it('should call skipFailedCommand and show success toast on success', async () => {
    const { result } = renderHook(() => useRecoveryCommands(props))

    await act(async () => {
      await result.current.skipFailedCommand()
    })

    expect(mockResumeRunFromRecovery).toHaveBeenCalledWith(mockRunId)
    expect(mockMakeSuccessToast).toHaveBeenCalled()
  })

  it('should call updateErrorRecoveryPolicy with correct policy rules when failedCommand has an error', async () => {
    const mockFailedCommandWithError = {
      ...mockFailedCommand,
      commandType: 'aspirateInPlace',
      error: {
        errorType: 'mockErrorType',
      },
    }

    const testProps = {
      ...props,
      failedCommand: mockFailedCommandWithError,
    }

    const { result } = renderHook(() => useRecoveryCommands(testProps))

    await act(async () => {
      await result.current.ignoreErrorKindThisRun()
    })

    const expectedPolicyRules = buildIgnorePolicyRules(
      'aspirateInPlace',
      'mockErrorType'
    )

    expect(mockUpdateErrorRecoveryPolicy).toHaveBeenCalledWith(
      expectedPolicyRules
    )
  })

  it('should reject with an error when failedCommand or error is null', async () => {
    const testProps = {
      ...props,
      failedCommand: null,
    }

    const { result } = renderHook(() => useRecoveryCommands(testProps))

    await expect(result.current.ignoreErrorKindThisRun()).rejects.toThrow(
      'Could not execute command. No failed command.'
    )
  })
})
