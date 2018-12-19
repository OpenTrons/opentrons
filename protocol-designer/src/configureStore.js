import {createStore, combineReducers, applyMiddleware, compose} from 'redux'
import thunk from 'redux-thunk'
import {makePersistSubscriber, rehydratePersistedAction} from './persist'
import {fileErrors} from './load-file/actions'

function getRootReducer () {
  const rootReducer = combineReducers({
    analytics: require('./analytics').rootReducer,
    dismiss: require('./dismiss').rootReducer,
    fileData: require('./file-data').rootReducer,
    labwareIngred: require('./labware-ingred/reducers').default,
    loadFile: require('./load-file').rootReducer,
    navigation: require('./navigation').rootReducer,
    pipettes: require('./pipettes').rootReducer,
    stepForms: require('./step-forms').rootReducer,
    steplist: require('./steplist').rootReducer,
    tutorial: require('./tutorial').rootReducer,
    ui: require('./ui').rootReducer,
    wellSelection: require('./well-selection/reducers').default,
  })

  return (state, action) => {
    if (action.type === 'LOAD_FILE' || action.type === 'CREATE_NEW_PROTOCOL') {
      const hydratedState = rootReducer(undefined, rehydratePersistedAction())

      // reset entire state, rehydrate from localStorage, then pass the action
      if (action.type === 'LOAD_FILE') {
        try {
          // TODO: Ian 2018-10-11 validate the file with JSON schema and remove this try/catch (See #2465)
          return rootReducer(hydratedState, action)
        } catch (e) {
          // something in the reducers went wrong, show it to the user for bug report
          return rootReducer(hydratedState, fileErrors({
            errorType: 'INVALID_JSON_FILE',
            message: e.message,
          }))
        }
      }
      return rootReducer(hydratedState, action)
    }
    // pass-thru
    return rootReducer(state, action)
  }
}

export default function configureStore () {
  const reducer = getRootReducer()

  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
  const store = createStore(
    reducer,
    /* preloadedState, */
    composeEnhancers(applyMiddleware(thunk))
  )

  // initial rehydration, and persistence subscriber
  store.dispatch(rehydratePersistedAction())
  store.subscribe(makePersistSubscriber(store))

  function replaceReducers () {
    const nextRootReducer = getRootReducer()
    store.replaceReducer(nextRootReducer)
  }

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept([
      './analytics/reducers',
      './dismiss/reducers',
      './file-data/reducers',
      './labware-ingred/reducers',
      './load-file/reducers',
      './navigation/reducers',
      './pipettes',
      './step-forms/reducers',
      './steplist/reducers',
      './tutorial/reducers',
      './ui/steps/reducers',
      './well-selection/reducers',
    ], replaceReducers)
  }

  return store
}
