import * as React from 'react'

import { useDispatch } from 'react-redux'

import { useHost } from '@opentrons/react-api-client'

import { appShellListener } from '../redux/shell/remote'
import { notifySubscribeAction } from '../redux/shell'
import {
  useTrackEvent,
  ANALYTICS_NOTIFICATION_PORT_BLOCK_ERROR,
} from '../redux/analytics'

import type { UseQueryOptions } from 'react-query'
import type { HostConfig } from '@opentrons/api-client'
import type { NotifyTopic, NotifyResponseData } from '../redux/shell/types'

export type HTTPRefetchFrequency = 'once' | 'always' | null

export interface QueryOptionsWithPolling<TData, TError = Error>
  extends UseQueryOptions<TData, TError> {
  forceHttpPolling?: boolean
}

interface UseNotifyServiceProps<TData, TError = Error> {
  topic: NotifyTopic
  setRefetch: (refetch: HTTPRefetchFrequency) => void
  options: QueryOptionsWithPolling<TData, TError>
  hostOverride?: HostConfig | null
}

export function useNotifyService<TData, TError = Error>({
  topic,
  setRefetch,
  options,
  hostOverride,
}: UseNotifyServiceProps<TData, TError>): void {
  const dispatch = useDispatch()
  const hostFromProvider = useHost()
  const host = hostOverride ?? hostFromProvider
  const hostname = host?.hostname ?? null
  const doTrackEvent = useTrackEvent()
<<<<<<< HEAD
=======
  const isFlex = useIsFlex(host?.robotName ?? '')
  const hasUsedNotifyService = React.useRef(false)
>>>>>>> 61be566d31 (fix(app): fix excessive /runs network requests (#14783))
  const seenHostname = React.useRef<string | null>(null)
  const { enabled, staleTime, forceHttpPolling } = options

  const shouldUseNotifications =
    !forceHttpPolling &&
    enabled !== false &&
    hostname != null &&
    staleTime !== Infinity

  React.useEffect(() => {
    if (shouldUseNotifications) {
      // Always fetch on initial mount.
      setRefetch('once')
      appShellListener({
        hostname,
        topic,
        callback: onDataEvent,
      })
      dispatch(notifySubscribeAction(hostname, topic))
<<<<<<< HEAD
      seenHostname.current = hostname
    } else {
      setRefetch('always')
    }

    return () => {
      if (seenHostname.current != null) {
=======
      hasUsedNotifyService.current = true
      seenHostname.current = hostname
    } else {
      setRefetchUsingHTTP('always')
    }

    return () => {
      if (hasUsedNotifyService.current) {
>>>>>>> 1ba616651c (refactor(app-shell-odd): Utilize robot-server unsubscribe flags (#14724))
        appShellListener({
<<<<<<< HEAD
          hostname: seenHostname.current,
=======
          hostname: seenHostname.current as string,
>>>>>>> 61be566d31 (fix(app): fix excessive /runs network requests (#14783))
          topic,
          callback: onDataEvent,
          isDismounting: true,
        })
      }
    }
  }, [topic, hostname, shouldUseNotifications])

  function onDataEvent(data: NotifyResponseData): void {
    if (data === 'ECONNFAILED' || data === 'ECONNREFUSED') {
      setRefetch('always')
      if (data === 'ECONNREFUSED') {
        doTrackEvent({
          name: ANALYTICS_NOTIFICATION_PORT_BLOCK_ERROR,
          properties: {},
        })
      }
<<<<<<< HEAD
    } else if ('refetch' in data || 'unsubscribe' in data) {
      setRefetch('once')
=======
    } else if ('refetchUsingHTTP' in data || 'unsubscribe' in data) {
      setRefetchUsingHTTP('once')
>>>>>>> fbfa607dac (refactor(app-shell, app-shell-odd): Refactor app to use unsubscribe flags (#14640))
    }
  }
}
