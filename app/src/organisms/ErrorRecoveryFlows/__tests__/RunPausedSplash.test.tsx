import * as React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, renderHook } from '@testing-library/react'
import { createStore } from 'redux'

import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { mockRecoveryContentProps } from '../__fixtures__'
import { getIsOnDevice } from '../../../redux/config'
import { useRunPausedSplash, RunPausedSplash } from '../RunPausedSplash'
import { StepInfo } from '../shared'

import type { Store } from 'redux'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Provider } from 'react-redux'

vi.mock('../../../redux/config')
vi.mock('../shared')

const store: Store<any> = createStore(vi.fn(), {})

describe('useRunPausedSplash', () => {
  let wrapper: React.FunctionComponent<{ children: React.ReactNode }>
  beforeEach(() => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    const queryClient = new QueryClient()
    wrapper = ({ children }) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    )
  })

  const IS_WIZARD_SHOWN = [false, true]
  IS_WIZARD_SHOWN.forEach(val => {
    it(`returns ${!val} if on the ODD and showERWizard is ${val}`, () => {
      const { result } = renderHook(() => useRunPausedSplash(true, val), {
        wrapper,
      })
      expect(result.current).toEqual(!val)
    })
    it(`always returns false if on desktop and showERWizard is ${val}`, () => {
      const { result } = renderHook(() => useRunPausedSplash(false, val), {
        wrapper,
      })
      expect(result.current).toEqual(false)
    })
  })
})

const render = (props: React.ComponentProps<typeof RunPausedSplash>) => {
  return renderWithProviders(
    <MemoryRouter>
      <RunPausedSplash {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('RunPausedSplash', () => {
  let props: React.ComponentProps<typeof RunPausedSplash>
  const mockToggleERWiz = vi.fn(() => Promise.resolve())
  const mockProceedToRouteAndStep = vi.fn()
  const mockRouteUpdateActions = {
    proceedToRouteAndStep: mockProceedToRouteAndStep,
  } as any

  beforeEach(() => {
    props = {
      ...mockRecoveryContentProps,
      toggleERWiz: mockToggleERWiz,
      routeUpdateActions: mockRouteUpdateActions,
    }

    vi.mocked(StepInfo).mockReturnValue(<div>MOCK STEP INFO</div>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render a generic paused screen if there is no handled errorType', () => {
    render(props)
    screen.getByText('Error')
    screen.getByText('MOCK STEP INFO')
  })

  it('should render an overpressure error type if the errorType is overpressure', () => {
    props = {
      ...props,
      failedCommand: {
        ...props.failedCommand,
        commandType: 'aspirate',
        error: { isDefined: true, errorType: 'overpressure' },
      } as any,
    }
    render(props)
    screen.getByText('Pipette overpressure')
    screen.getByText('MOCK STEP INFO')
  })

  it('should contain buttons with expected appearance and behavior', async () => {
    render(props)

    const primaryBtn = screen.getByRole('button', {
      name: 'Launch Recovery Mode',
    })
    const secondaryBtn = screen.getByRole('button', { name: 'Cancel run' })

    expect(primaryBtn).toBeInTheDocument()
    expect(secondaryBtn).toBeInTheDocument()

    fireEvent.click(secondaryBtn)

    await waitFor(() => {
      expect(mockToggleERWiz).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(mockToggleERWiz).toHaveBeenCalledWith(false)
    })
    await waitFor(() => {
      expect(mockProceedToRouteAndStep).toHaveBeenCalledTimes(1)
    })

    expect(mockToggleERWiz.mock.invocationCallOrder[0]).toBeLessThan(
      mockProceedToRouteAndStep.mock.invocationCallOrder[0]
    )

    fireEvent.click(primaryBtn)
    await waitFor(() => {
      expect(mockToggleERWiz).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(mockToggleERWiz).toHaveBeenCalledWith(true)
    })
  })
})
