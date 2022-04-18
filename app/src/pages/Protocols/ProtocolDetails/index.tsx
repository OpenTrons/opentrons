import * as React from 'react'
import { useParams, Redirect } from 'react-router-dom'

import { useDispatch, useSelector } from 'react-redux'
import {
  fetchProtocols,
  getStoredProtocol,
} from '../../../redux/protocol-storage'
import { ProtocolDetails as ProtocolDetailsContents } from '../../../organisms/ProtocolDetails'

import type { Dispatch, State } from '../../../redux/types'
import type { NextGenRouteParams } from '../../../App/types'

export function ProtocolDetails(): JSX.Element {
  const { protocolKey } = useParams<NextGenRouteParams>()

  const dispatch = useDispatch<Dispatch>()
  const storedProtocol = useSelector((state: State) =>
    getStoredProtocol(state, protocolKey)
  )

  React.useEffect(() => {
    dispatch(fetchProtocols())
  }, [])

  return storedProtocol != null ? (
    <ProtocolDetailsContents {...storedProtocol} />
  ) : (
    <Redirect to="/protocols" />
  )
}
