import * as React from 'react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { mockRecoveryContentProps } from '../__fixtures__'
import {
  ErrorRecoveryContent,
  useInitialPipetteHome,
  useERWizard,
} from '../ErrorRecoveryWizard'
import { RECOVERY_MAP } from '../constants'
import { BeforeBeginning } from '../BeforeBeginning'
import { SelectRecoveryOption, RetryStep } from '../RecoveryOptions'
import { RecoveryInProgress } from '../RecoveryInProgress'

import type { Mock } from 'vitest'

vi.mock('../BeforeBeginning')
vi.mock('../RecoveryOptions')
vi.mock('../RecoveryInProgress')

describe('useERWizard', () => {
  it('has correct initial values', () => {
    const { result } = renderHook(() => useERWizard())
    expect(result.current.showERWizard).toBe(false)
    expect(result.current.hasLaunchedRecovery).toBe(false)
  })

  it('correctly toggles showERWizard and updates hasLaunchedRecovery as expected', async () => {
    const { result } = renderHook(() => useERWizard())

    await act(async () => {
      await result.current.toggleERWizard(true)
    })

    expect(result.current.showERWizard).toBe(true)
    expect(result.current.hasLaunchedRecovery).toBe(true)

    await act(async () => {
      await result.current.toggleERWizard(false)
    })

    expect(result.current.showERWizard).toBe(false)
    expect(result.current.hasLaunchedRecovery).toBe(false)
  })
})

const render = (props: React.ComponentProps<typeof ErrorRecoveryContent>) => {
  return renderWithProviders(<ErrorRecoveryContent {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ErrorRecoveryContent', () => {
  const {
    OPTION_SELECTION,
    BEFORE_BEGINNING,
    RETRY_FAILED_COMMAND,
    ROBOT_CANCELING,
    ROBOT_RESUMING,
    ROBOT_IN_MOTION,
    ROBOT_RETRYING_COMMAND,
  } = RECOVERY_MAP

  let props: React.ComponentProps<typeof ErrorRecoveryContent>

  beforeEach(() => {
    props = mockRecoveryContentProps

    vi.mocked(SelectRecoveryOption).mockReturnValue(
      <div>MOCK_SELECT_RECOVERY_OPTION</div>
    )
    vi.mocked(BeforeBeginning).mockReturnValue(<div>MOCK_BEFORE_BEGINNING</div>)
    vi.mocked(RetryStep).mockReturnValue(<div>MOCK_RESUME_RUN</div>)
    vi.mocked(RecoveryInProgress).mockReturnValue(<div>MOCK_IN_PROGRESS</div>)
  })

  it(`returns SelectRecoveryOption when the route is ${OPTION_SELECTION.ROUTE}`, () => {
    render(props)

    screen.getByText('MOCK_SELECT_RECOVERY_OPTION')
  })

  it(`returns BeforeBeginning when the route is ${BEFORE_BEGINNING.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: BEFORE_BEGINNING.ROUTE,
      },
    }
    render(props)

    screen.getByText('MOCK_BEFORE_BEGINNING')
  })

  it(`returns ResumeRun when the route is ${RETRY_FAILED_COMMAND.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: RETRY_FAILED_COMMAND.ROUTE,
      },
    }
    render(props)

    screen.getByText('MOCK_RESUME_RUN')
  })

  it(`returns RecoveryInProgressModal when the route is ${ROBOT_CANCELING.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_CANCELING.ROUTE,
      },
    }
    render(props)

    screen.getByText('MOCK_IN_PROGRESS')
  })

  it(`returns RecoveryInProgressModal when the route is ${ROBOT_IN_MOTION.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_IN_MOTION.ROUTE,
      },
    }
    render(props)

    screen.getByText('MOCK_IN_PROGRESS')
  })

  it(`returns RecoveryInProgressModal when the route is ${ROBOT_RESUMING.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_IN_MOTION.ROUTE,
      },
    }
    render(props)

    screen.getByText('MOCK_IN_PROGRESS')
  })

  it(`returns RecoveryInProgressModal when the route is ${ROBOT_RETRYING_COMMAND.ROUTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        route: ROBOT_IN_MOTION.ROUTE,
      },
    }
    render(props)

    screen.getByText('MOCK_IN_PROGRESS')
  })
})

describe('useInitialPipetteHome', () => {
  let mockZHomePipetteZAxes: Mock
  let mockSetRobotInMotion: Mock
  let mockRecoveryCommands: any
  let mockRouteUpdateActions: any

  beforeEach(() => {
    mockZHomePipetteZAxes = vi.fn()
    mockSetRobotInMotion = vi.fn()

    mockSetRobotInMotion.mockResolvedValue(() => mockZHomePipetteZAxes())
    mockZHomePipetteZAxes.mockResolvedValue(() => mockSetRobotInMotion())

    mockRecoveryCommands = {
      homePipetteZAxes: mockZHomePipetteZAxes,
    } as any
    mockRouteUpdateActions = {
      setRobotInMotion: mockSetRobotInMotion,
    } as any
  })

  it('does not z-home the pipettes if error recovery was not launched', () => {
    renderHook(() =>
      useInitialPipetteHome({
        hasLaunchedRecovery: false,
        recoveryCommands: mockRecoveryCommands,
        routeUpdateActions: mockRouteUpdateActions,
      })
    )

    expect(mockSetRobotInMotion).not.toHaveBeenCalled()
  })

  it('sets the motion screen properly and z-homes all pipettes only on the initial render of Error Recovery', async () => {
    const { rerender } = renderHook(() =>
      useInitialPipetteHome({
        hasLaunchedRecovery: true,
        recoveryCommands: mockRecoveryCommands,
        routeUpdateActions: mockRouteUpdateActions,
      })
    )

    await waitFor(() => {
      expect(mockSetRobotInMotion).toHaveBeenCalledWith(true)
    })
    await waitFor(() => {
      expect(mockZHomePipetteZAxes).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(mockSetRobotInMotion).toHaveBeenCalledWith(false)
    })

    expect(mockSetRobotInMotion.mock.invocationCallOrder[0]).toBeLessThan(
      mockZHomePipetteZAxes.mock.invocationCallOrder[0]
    )
    expect(mockZHomePipetteZAxes.mock.invocationCallOrder[0]).toBeLessThan(
      mockSetRobotInMotion.mock.invocationCallOrder[1]
    )

    rerender()

    await waitFor(() => {
      expect(mockSetRobotInMotion).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(mockZHomePipetteZAxes).toHaveBeenCalledTimes(1)
    })
  })
})
