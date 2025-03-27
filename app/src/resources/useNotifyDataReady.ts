import { useRef, useState, useEffect, useCallback } from 'react'

import { useDispatch } from 'react-redux'

import { useHost } from '@opentrons/react-api-client'

import { appShellListener } from '/app/redux/shell/remote'
import { notifySubscribeAction } from '/app/redux/shell'
import {
  useTrackEvent,
  ANALYTICS_NOTIFICATION_PORT_BLOCK_ERROR,
} from '/app/redux/analytics'
import { useFeatureFlag } from '/app/redux/config'

import type { UseQueryOptions } from 'react-query'
import type { HostConfig } from '@opentrons/api-client'
import type { NotifyTopic, NotifyResponseData } from '/app/redux/shell/types'

export type HTTPRefetchFrequency = 'once' | null

export interface QueryOptionsWithPolling<TData, TError = Error>
  extends UseQueryOptions<TData, TError> {
  forceHttpPolling?: boolean
}

interface UseNotifyDataReadyProps<TData, TError = Error> {
  topic: NotifyTopic
  options: QueryOptionsWithPolling<TData, TError>
  hostOverride?: HostConfig | null
}

interface UseNotifyDataReadyResults<TData, TError> {
  /* React Query options with notification-specific logic. */
  queryOptionsNotify: QueryOptionsWithPolling<TData, TError>
  /* Whether notifications indicate the server has new data ready. Always returns false if notifications are disabled. */
  shouldRefetch: boolean
}

// React query hooks perform refetches when instructed by the shell via a refetch mechanism, which useNotifyDataReady manages.
// The notification refetch states may be:
// 'once' - The shell has received an MQTT update. Execute the HTTP refetch once.
// null - The shell has not received an MQTT update. Don't execute an HTTP refetch.
//
// Eagerly assume notifications are enabled unless specified by the client via React Query options or by the shell via errors.
export function useNotifyDataReady<TData, TError = Error>({
  topic,
  options,
  hostOverride,
}: UseNotifyDataReadyProps<TData, TError>): UseNotifyDataReadyResults<
  TData,
  TError
> {
  const dispatch = useDispatch()
  const hostFromProvider = useHost()
  const host = hostOverride ?? hostFromProvider
  const hostname = host?.hostname ?? null
  const doTrackEvent = useTrackEvent()
  const forcePollingFF = useFeatureFlag('forceHttpPolling')
  const seenHostname = useRef<string | null>(null)
  const [refetch, setRefetch] = useState<HTTPRefetchFrequency>(null)
  const [
    hasEncounteredNotificationsError,
    setHasEncounteredNotificationsError,
  ] = useState(false)

  const { enabled, staleTime, forceHttpPolling } = options

  const shouldUseNotifications =
    !forceHttpPolling &&
    enabled !== false &&
    hostname != null &&
    staleTime !== Infinity &&
    !forcePollingFF

  useEffect(() => {
    if (shouldUseNotifications) {
      // Always fetch on initial mount to keep latency as low as possible.
      setRefetch('once')
      appShellListener({
        hostname,
        notifyTopic: topic,
        callback: onDataEvent,
      })
      dispatch(notifySubscribeAction(hostname, topic))
      seenHostname.current = hostname
    }

    return () => {
      if (seenHostname.current != null) {
        appShellListener({
          hostname: seenHostname.current,
          notifyTopic: topic,
          callback: onDataEvent,
          isDismounting: true,
        })
      }
    }
  }, [topic, hostname, shouldUseNotifications])

  const onDataEvent = useCallback((data: NotifyResponseData): void => {
    if (data === 'ECONNFAILED' || data === 'ECONNREFUSED') {
      setHasEncounteredNotificationsError(true)
      if (data === 'ECONNREFUSED') {
        doTrackEvent({
          name: ANALYTICS_NOTIFICATION_PORT_BLOCK_ERROR,
          properties: {},
        })
      }
    } else if ('refetch' in data || 'unsubscribe' in data) {
      setRefetch('once')
    }
  }, [])

  const notifyOnSettled = useCallback(
    (data: TData | undefined, error: TError | null) => {
      if (refetch === 'once') {
        setRefetch(null)
      }
      options.onSettled?.(data, error)
    },
    [refetch, options.onSettled]
  )

  const isNotifyEnabled =
    shouldUseNotifications && !hasEncounteredNotificationsError
  const queryOptionsNotify = {
    ...options,
    onSettled: isNotifyEnabled ? notifyOnSettled : options.onSettled,
    refetchInterval: isNotifyEnabled ? false : options.refetchInterval,
  }

  return {
    queryOptionsNotify,
    shouldRefetch: isNotifyEnabled && refetch != null,
  }
}
