// client entry point and application manifest
import React from 'react'
import ReactDom from 'react-dom'
import {Provider} from 'react-redux'
import {AppContainer} from 'react-hot-loader'
import {createStore, applyMiddleware, compose} from 'redux'
import thunk from 'redux-thunk'
import createHistory from 'history/createBrowserHistory'
import {ConnectedRouter, routerMiddleware} from 'react-router-redux'

import {alertMiddleware} from './interface'
import {apiClientMiddleware as robotApiMiddleware} from './robot'
import {middleware as analyticsMiddleware} from './analytics'
import reducer from './reducer'

// analytics events map
// in a separate file for separation of concerns / DI / cicular dep prevention
import analyticsEventsMap from './analytics/events-map'

// components
import App from './components/App'

const history = createHistory()

const middleware = applyMiddleware(
  thunk,
  robotApiMiddleware(),
  analyticsMiddleware(analyticsEventsMap),
  alertMiddleware(window),
  routerMiddleware(history)
)

const composeEnhancers = global.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

const store = createStore(reducer, composeEnhancers(middleware))

const renderApp = () => ReactDom.render(
  (
    <AppContainer>
      <Provider store={store}>
        <ConnectedRouter history={history}>
          <App />
        </ConnectedRouter>
      </Provider>
    </AppContainer>
  ),
  document.getElementById('root')
)

if (module.hot) {
  module.hot.accept('./components/App', renderApp)
}

if (process.env.NODE_ENV === 'development') {
  global.store = store
}

renderApp()
