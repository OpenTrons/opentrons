/* eslint-disable @typescript-eslint/no-var-requires */
import {
  createStore,
  combineReducers,
  applyMiddleware,
  compose,
  Store,
  Reducer,
} from 'redux'
import thunk from 'redux-thunk'
import { trackEventMiddleware } from './analytics/middleware'
import { makePersistSubscriber, rehydratePersistedAction } from './persist'
import { fileUploadMessage } from './load-file/actions'
import { makeTimelineMiddleware } from './timelineMiddleware/makeTimelineMiddleware'
import { BaseState, Action } from './types'
const timelineMiddleware = makeTimelineMiddleware()
const ReselectTools =
  process.env.NODE_ENV === 'development' ? require('reselect-tools') : undefined

function getRootReducer(): Reducer<BaseState, Action> {
  const rootReducer = combineReducers<BaseState>({
    analytics: require('./analytics').rootReducer,
    dismiss: require('./dismiss').rootReducer,
    featureFlags: require('./feature-flags').rootReducer,
    fileData: require('./file-data').rootReducer,
    labwareIngred: require('./labware-ingred/reducers').rootReducer,
    loadFile: require('./load-file').rootReducer,
    navigation: require('./navigation').rootReducer,
    stepForms: require('./step-forms').rootReducer,
    tutorial: require('./tutorial').rootReducer,
    ui: require('./ui').rootReducer,
    wellSelection: require('./well-selection/reducers').rootReducer,
  })
  // TODO: Ian 2019-06-25 consider making file loading non-committal
  // so UNDO_LOAD_FILE doesnt' just reset Redux state
  return (state: any, action) => {
    if (
      action.type === 'LOAD_FILE' ||
      action.type === 'CREATE_NEW_PROTOCOL' ||
      action.type === 'UNDO_LOAD_FILE'
    ) {
      // reset entire state, rehydrate from localStorage
      const resetState = rootReducer(undefined, rehydratePersistedAction())

      if (action.type === 'LOAD_FILE') {
        try {
          return rootReducer(resetState, action)
        } catch (e) {
          console.error(e)
          // something in the reducers went wrong, show it to the user for bug report
          return rootReducer(
            state,
            fileUploadMessage({
              isError: true,
              errorType: 'INVALID_JSON_FILE',
              errorMessage: e.message,
            })
          )
        }
      }

      return rootReducer(resetState, action)
    }

    // pass-thru
    return rootReducer(state, action)
  }
}

export type StoreType = Store<BaseState, Action>

export function configureStore(): StoreType {
  const reducer = getRootReducer()
  const composeEnhancers: any =
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
  const store = createStore(
    reducer,
    /* preloadedState, */
    composeEnhancers(
      applyMiddleware(trackEventMiddleware, timelineMiddleware, thunk)
    )
  )
  // give reselect tools access to state if in dev env
  if (ReselectTools) ReselectTools.getStateWith(() => store.getState())
  // initial rehydration, and persistence subscriber
  store.dispatch(rehydratePersistedAction())
  store.subscribe(makePersistSubscriber(store))

  global.enablePrereleaseMode = () => {
    store.dispatch({
      type: 'SET_FEATURE_FLAGS',
      payload: {
        PRERELEASE_MODE: true,
      },
    })
  }

  function replaceReducers(): void {
    const nextRootReducer = getRootReducer()
    store.replaceReducer(nextRootReducer)
  }

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept(
      [
        './analytics/reducers',
        './dismiss/reducers',
        './feature-flags/reducers',
        './file-data/reducers',
        './labware-defs/reducers', // NOTE: labware-defs is nested inside step-forms, so it doesn't need to go directly into getRootReducer fn above
        './labware-ingred/reducers',
        './load-file/reducers',
        './navigation/reducers',
        './step-forms/reducers',
        './tutorial/reducers',
        './ui/steps/reducers',
        './well-selection/reducers',
      ],
      replaceReducers
    )
  }

  return store
}
