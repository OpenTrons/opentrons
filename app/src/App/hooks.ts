import { useCallback, useRef, useEffect } from 'react'
import difference from 'lodash/difference'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from 'react-query'
import { useDispatch } from 'react-redux'

import { useInterval, truncateString } from '@opentrons/components'
import {
  useAllProtocolIdsQuery,
  useHost,
  useCreateLiveCommandMutation,
} from '@opentrons/react-api-client'
import { getProtocol } from '@opentrons/api-client'

import { checkShellUpdate } from '/app/redux/shell'
import { useToaster } from '/app/organisms/ToasterOven'

import type { SetStatusBarCreateCommand } from '@opentrons/shared-data'
import type { Dispatch } from '/app/redux/types'

const UPDATE_RECHECK_INTERVAL_MS = 60000
const PROTOCOL_IDS_RECHECK_INTERVAL_MS = 3000

export function useSoftwareUpdatePoll(): void {
  const dispatch = useDispatch<Dispatch>()
  const checkAppUpdate = useCallback(() => dispatch(checkShellUpdate()), [
    dispatch,
  ])
  useInterval(checkAppUpdate, UPDATE_RECHECK_INTERVAL_MS)
}

export function useProtocolReceiptToast(): void {
  const host = useHost()
  const { t, i18n } = useTranslation(['protocol_info', 'shared'])
  const { makeToast } = useToaster()
  const queryClient = useQueryClient()
  const protocolIdsQuery = useAllProtocolIdsQuery(
    {
      refetchInterval: PROTOCOL_IDS_RECHECK_INTERVAL_MS,
    },
    true
  )
  const protocolIds = protocolIdsQuery.data?.data ?? []
  const protocolIdsRef = useRef(protocolIds)
  const hasRefetched = useRef(true)
  const { createLiveCommand } = useCreateLiveCommandMutation()
  const animationCommand: SetStatusBarCreateCommand = {
    commandType: 'setStatusBar',
    params: { animation: 'confirm' },
  }

  if (protocolIdsQuery.isRefetching) {
    hasRefetched.current = false
  }

  useEffect(() => {
    const newProtocolIds = difference(protocolIds, protocolIdsRef.current)
    if (!hasRefetched.current && newProtocolIds.length > 0) {
      Promise.all(
        newProtocolIds.map(protocolId => {
          if (host != null) {
            return (
              getProtocol(host, protocolId).then(
                data =>
                  data.data.data.metadata.protocolName ??
                  data.data.data.files[0].name
              ) ?? ''
            )
          } else {
            return Promise.reject(
              new Error(
                'no host provider info inside of useProtocolReceiptToast'
              )
            )
          }
        })
      )
        .then(protocolNames => {
          protocolNames.forEach(name => {
            makeToast(
              t('protocol_added', {
                protocol_name: truncateString(name, 30),
              }) as string,
              'success',
              {
                buttonText: i18n.format(t('shared:close'), 'capitalize'),
                disableTimeout: true,
                displayType: 'odd',
              }
            )
          })
        })
        .then(() => {
          queryClient
            .invalidateQueries([host, 'protocols'])
            .catch((e: Error) => {
              console.error(`error invalidating protocols query: ${e.message}`)
            })
        })
        .then(() => {
          createLiveCommand({
            command: animationCommand,
          }).catch((e: Error) => {
            console.warn(`cannot run status bar animation: ${e.message}`)
          })
        })
        .catch((e: Error) => {
          console.error(e)
        })
    }
    protocolIdsRef.current = protocolIds
    // dont want this hook to rerun when other deps change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocolIds])
}
