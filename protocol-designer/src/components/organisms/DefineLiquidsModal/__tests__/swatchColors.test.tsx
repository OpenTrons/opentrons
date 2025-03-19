import { describe, it, expect, vi } from 'vitest'
import { AIR } from '@opentrons/step-generation'
import { DEFAULT_LIQUID_COLORS } from '@opentrons/shared-data'
import { swatchColors } from '../swatchColors'

vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('swatchColors', () => {
  it('returns the correct color for an integer ingredient group ID', () => {
    const color = swatchColors('2') // Assuming index 2 exists
    expect(color).toBe(DEFAULT_LIQUID_COLORS[2 % DEFAULT_LIQUID_COLORS.length])
  })

  it('returns "transparent" for AIR', () => {
    expect(swatchColors(AIR)).toBe('transparent')
  })

  it('logs a warning and returns "transparent" for a non-integer string', () => {
    const invalidInput = 'invalidString'
    const result = swatchColors(invalidInput)

    expect(console.warn).toHaveBeenCalledWith(
      `swatchColors expected an integer or ${AIR}, got ${invalidInput}`
    )
    expect(result).toBe('transparent')
  })

  it('correctly wraps around DEFAULT_LIQUID_COLORS using modulo', () => {
    const indexBeyondRange = DEFAULT_LIQUID_COLORS.length + 5
    const expectedColor =
      DEFAULT_LIQUID_COLORS[indexBeyondRange % DEFAULT_LIQUID_COLORS.length]

    expect(swatchColors(String(indexBeyondRange))).toBe(expectedColor)
  })
})
