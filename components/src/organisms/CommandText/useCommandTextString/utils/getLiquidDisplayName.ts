import type { Liquid } from '@opentrons/shared-data'

export function getLiquidDisplayName(
  liquids: Liquid[],
  liquidId: string
): string {
  const liquidDisplayName = liquids.find(liquid => liquid.id === liquidId)
    ?.displayName
  return liquidDisplayName ?? ''
}
