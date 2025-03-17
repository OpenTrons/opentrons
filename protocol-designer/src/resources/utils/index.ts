import type { MoveLiquidPrefixType } from '../types'

export const prefixMap: Record<MoveLiquidPrefixType, string> = {
  aspirate: 'aspirate',
  dispense: 'dispense',
  mix: 'mix',
  aspirate_retract: 'retract',
  dispense_retract: 'retract',
}
