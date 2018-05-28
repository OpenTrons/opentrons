// flow-typed signature: ab08daae50bf7eb3752473d3a6dd3a5a
// flow-typed version: <<STUB>>/react-router-redux_v^5.0.0-alpha.6/flow_v0.66.0

/**
 * This is an autogenerated libdef stub for:
 *
 *   'react-router-redux'
 *
 * Fill this stub out by replacing all the `any` types.
 *
 * Once filled out, we encourage you to share your work with the
 * community by sending a pull request to:
 * https://github.com/flowtype/flow-typed
 */

declare module 'react-router-redux' {
  declare module.exports: any;

  // action types
  declare type LocationChangeAction = {|
    type: '@@router/LOCATION_CHANGE',
    // TODO(mc, 2018-05-28): this type has changed since @beta.6
    payload: {|
      pathname: string,
      search: string,
      hash: string,
    |}
  |}

  declare type CallHistoryMethodAction = {|
    type: '@@router/CALL_HISTORY_METHOD',
    payload: {|
      method: 'push' | 'replace' | 'go' | 'goBack' | 'goForward',
      args: Array<any>
    |}
  |}

  declare type RouterAction =
    | LocationChangeAction
    | CallHistoryMethodAction
}
