// @flow
// http api client types

import type { Error } from '../types'

export type ApiRequestError = Error & {
  url?: string,
  status?: number,
  statusText?: string,
}

export type ApiCall<T, U> = {
  /** request in progress flag */
  inProgress: boolean,
  /** possible error response */
  error?: ?ApiRequestError,
  /** possible request body */
  request?: ?T,
  /** possible success response body */
  response?: ?U,
}
