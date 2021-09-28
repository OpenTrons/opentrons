import { useSelector } from 'react-redux'
import { getProtocolData, getProtocolName } from '../../redux/protocol'

import type { ProtocolFileV5 } from '@opentrons/shared-data'
import type { State } from '../../redux/types'

interface ProtocolDetails {
  displayName: string | null
  protocolData: ProtocolFileV5<{}> | null // TODO: IMMEDIATELY update to ProtocolFileV6 once schema is complete
}

export function useProtocolDetails(): ProtocolDetails {
  const protocolData = useSelector((state: State) =>
    getProtocolData(state)
  ) as ProtocolFileV5<{}> | null
  const displayName = useSelector((state: State) => getProtocolName(state))
  return { displayName, protocolData }
}
