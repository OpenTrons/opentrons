// @flow
import type { WellDefinition } from '../types'

/** Well is either rect or circle. Depends on whether `diameter` exists */
export default function wellIsRect(wellDef: WellDefinition) {
  return !(typeof wellDef.diameter === 'number')
}
