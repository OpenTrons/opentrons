import { describe, beforeEach, afterEach, it, vi, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSelector, Provider } from 'react-redux'
import { createStore } from 'redux'
import { I18nextProvider } from 'react-i18next'

import { i18n } from '/app/i18n'
import { LPC_STEP } from '/app/redux/protocol-runs'
import { useLPCHeaderCommands } from '../useLPCHeaderCommands'

import type { FunctionComponent, ReactNode } from 'react'
import type { UseLPCCommandsResult } from '/app/organisms/LabwarePositionCheck/hooks'
import type { UseLPCHeaderCommandsProps } from '../useLPCHeaderCommands'
import type { State } from '/app/redux/types'
import type { Store } from 'redux'

vi.mock('react-redux', async importOriginal => {
  const actual = await importOriginal<typeof Provider>()
  return {
    ...actual,
    useSelector: vi.fn(),
  }
})

let props: UseLPCHeaderCommandsProps
let mockLPCHandlerUtils: UseLPCCommandsResult
let wrapper: FunctionComponent<{ children: ReactNode }>
let store: Store<State>
let toggleRobotMovingPromise: Promise<void>
let handleStartLPCPromise: Promise<void>
let handleProbeAttachmentPromise: Promise<void>
let handleValidMoveToMaintenancePositionPromise: Promise<void>
let handleHomeAndClose: Promise<void>
let handleCloseNoHome: Promise<void>

describe('useLPCHeaderCommands', () => {
  const mockPipette = { id: 'mock-pipette' }
  const mockRunId = 'mock-run-id'
  const mockProceedStep = vi.fn()

  beforeEach(() => {
    toggleRobotMovingPromise = Promise.resolve()
    handleStartLPCPromise = Promise.resolve()
    handleProbeAttachmentPromise = Promise.resolve()
    handleValidMoveToMaintenancePositionPromise = Promise.resolve()
    handleHomeAndClose = Promise.resolve()
    handleCloseNoHome = Promise.resolve()

    mockLPCHandlerUtils = {
      toggleRobotMoving: vi.fn(() => toggleRobotMovingPromise),
      handleStartLPC: vi.fn(() => handleStartLPCPromise),
      handleProbeAttachment: vi.fn(() => handleProbeAttachmentPromise),
      handleValidMoveToMaintenancePosition: vi.fn(
        () => handleValidMoveToMaintenancePositionPromise
      ),
      handleHomeAndClose: vi.fn(() => handleHomeAndClose),
      handleCloseNoHome: vi.fn(() => handleCloseNoHome),
    } as any

    props = {
      LPCHandlerUtils: mockLPCHandlerUtils,
      proceedStep: mockProceedStep,
      goBackLastStep: vi.fn(),
      runId: mockRunId,
    }

    store = createStore(vi.fn(), {})
    store.dispatch = vi.fn()

    wrapper = ({ children }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )

    vi.mocked(useSelector).mockImplementation(() => {
      return mockPipette
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should execute handleProceed commands in correct sequence', async () => {
    const { result } = renderHook(() => useLPCHeaderCommands(props), {
      wrapper,
    })

    await act(async () => {
      result.current.handleProceed()
    })

    await waitFor(() => {
      expect(mockLPCHandlerUtils.toggleRobotMoving).toHaveBeenCalledWith(true)
    })

    await waitFor(() => {
      expect(mockLPCHandlerUtils.handleStartLPC).toHaveBeenCalledWith(
        mockPipette,
        mockProceedStep
      )
    })

    await waitFor(() => {
      expect(mockLPCHandlerUtils.toggleRobotMoving).toHaveBeenCalledWith(false)
    })
  })

  it('should execute handleAttachProbeCheck commands in correct sequence', async () => {
    const { result } = renderHook(() => useLPCHeaderCommands(props), {
      wrapper,
    })

    await act(async () => {
      result.current.handleAttachProbeCheck()
    })

    await waitFor(() => {
      expect(mockLPCHandlerUtils.toggleRobotMoving).toHaveBeenCalledWith(true)
    })

    await waitFor(() => {
      expect(mockLPCHandlerUtils.handleProbeAttachment).toHaveBeenCalledWith(
        mockPipette
      )
    })

    await waitFor(() => {
      expect(mockProceedStep).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(mockLPCHandlerUtils.toggleRobotMoving).toHaveBeenCalledWith(false)
    })
  })

  it('should execute handleNavToDetachProbe commands in correct sequence', async () => {
    const { result } = renderHook(() => useLPCHeaderCommands(props), {
      wrapper,
    })

    await act(async () => {
      result.current.handleNavToDetachProbe()
    })

    await waitFor(() => {
      expect(mockLPCHandlerUtils.toggleRobotMoving).toHaveBeenCalledWith(true)
    })

    await waitFor(() => {
      expect(
        mockLPCHandlerUtils.handleValidMoveToMaintenancePosition
      ).toHaveBeenCalledWith(mockPipette)
    })

    await waitFor(() => {
      expect(mockProceedStep).toHaveBeenCalledWith(LPC_STEP.DETACH_PROBE)
    })

    await waitFor(() => {
      expect(mockLPCHandlerUtils.toggleRobotMoving).toHaveBeenCalledWith(false)
    })
  })

  it('should execute handleCloseAndHome commands in correct sequence', async () => {
    const { result } = renderHook(() => useLPCHeaderCommands(props), {
      wrapper,
    })

    await act(async () => {
      result.current.handleCloseAndHome()
    })

    await waitFor(() => {
      expect(mockLPCHandlerUtils.toggleRobotMoving).toHaveBeenCalledWith(true)
    })

    await waitFor(() => {
      expect(mockLPCHandlerUtils.handleHomeAndClose).toHaveBeenCalled()
    })
  })

  it('should execute handleCloseWithoutHome commands in correct sequence', async () => {
    const { result } = renderHook(() => useLPCHeaderCommands(props), {
      wrapper,
    })

    await act(async () => {
      result.current.handleCloseWithoutHome()
    })

    await waitFor(() => {
      expect(mockLPCHandlerUtils.handleCloseNoHome).toHaveBeenCalled()
    })
  })
})
