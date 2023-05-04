import { COLORS } from '@opentrons/components'
import { AIR } from '@opentrons/step-generation'

export const MIXED_WELL_COLOR = '#9b9b9b' // NOTE: matches `--c-med-gray` in COLORS.liquidColors.css

export const swatchColors = (ingredGroupId: string): string => {
  const num = Number(ingredGroupId)

  if (!Number.isInteger(num)) {
    if (ingredGroupId !== AIR) {
      console.warn(
        `swatchColors expected an integer or ${AIR}, got ${ingredGroupId}`
      )
    }

    return 'transparent'
  }

  return COLORS.liquidColors[num % COLORS.liquidColors.length]
}
