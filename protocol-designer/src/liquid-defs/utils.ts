import { getAllLiquidClassDefs } from '@opentrons/shared-data'
import type { LiquidClass } from '@opentrons/shared-data'

const liquidClassDefs = getAllLiquidClassDefs()
export const getLiquidClassDisplayName = (
  liquidClass: string | null
): string | null => {
  if (liquidClass == null) {
    return null
  }
  if (!(liquidClass in liquidClassDefs)) {
    console.warn(`Liquid class ${liquidClass} not found`)
    return null
  }
  return liquidClassDefs[liquidClass].displayName
}

export const getSortedLiquidClassDefs = (): Record<string, LiquidClass> => {
  return Object.fromEntries(
    Object.entries(liquidClassDefs).sort(([, valueA], [, valueB]) =>
      valueA.displayName.localeCompare(valueB.displayName)
    )
  )
}
