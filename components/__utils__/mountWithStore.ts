import assert from 'assert'
import * as React from 'react'
import { Provider } from 'react-redux'
import { mount } from 'enzyme'

import type { ReactWrapper } from 'enzyme'

export interface MockStore<State, Action> {
  getState: jest.MockedFunction<() => State>
  subscribe: jest.MockedFunction<() => void>
  dispatch: jest.MockedFunction<(action: Action) => Action>
}

export interface WrapperWithStore<Props, State = {}, Action = {}> {
  wrapper: ReactWrapper<Props>
  store: MockStore<State, Action>
  refresh: (nextState?: State) => void
}

export interface MountWithStoreOptions<State> {
  initialState?: State
  [key: string]: unknown
}

export function mountWithStore<Props, State = {}, Action = {}>(
  node: React.ReactElement<Props>,
  options?: MountWithStoreOptions<State>
): WrapperWithStore<Props, State, Action> {
  const initialState = options?.initialState ?? ({} as State)

  const store: MockStore<State, Action> = {
    getState: jest.fn(() => initialState),
    subscribe: jest.fn(),
    dispatch: jest.fn(),
  }

  const wrapper = mount<Props>(node, {
    wrappingComponent: Provider,
    wrappingComponentProps: { store },
  })

  // force a re-render by returning a new state to recalculate selectors
  // and sending a blank set of new props to the wrapper
  const refresh = (maybeNextState?: State): void => {
    const nextState = maybeNextState ?? { ...initialState }

    assert(
      nextState !== initialState,
      'nextState must be different than initialState to trigger a re-render'
    )

    store.getState.mockReturnValue(nextState)
    wrapper.setProps({})
  }

  return { wrapper, store, refresh }
}
