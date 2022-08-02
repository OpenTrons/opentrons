import * as React from 'react'
import { renderHook } from '@testing-library/react-hooks'
import { createStore } from 'redux'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'

import { i18n } from '../../i18n'
import { checkShellUpdate } from '../../redux/shell'
import { useSoftwareUpdatePoll } from '../hooks'

import type { Store } from 'redux'
import type { State } from '../../redux/types'

describe('useSoftwareUpdatePoll', () => {
  let wrapper: React.FunctionComponent<{}>
  let store: Store<State>
  beforeEach(() => {
    jest.useFakeTimers()
    store = createStore(jest.fn(), {})
    store.dispatch = jest.fn()
    wrapper = ({ children }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
  })
  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
    jest.resetAllMocks()
  })
  it('checks for update availability on an interval', () => {
    renderHook(useSoftwareUpdatePoll, { wrapper })

    expect(store.dispatch).not.toHaveBeenCalledWith(checkShellUpdate())
    jest.advanceTimersByTime(60001)
    expect(store.dispatch).toHaveBeenCalledTimes(1)
    expect(store.dispatch).toHaveBeenCalledWith(checkShellUpdate())
  })
})
