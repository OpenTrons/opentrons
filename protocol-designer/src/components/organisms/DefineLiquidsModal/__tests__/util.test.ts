import { describe, it, expect } from 'vitest'
import { rgbaToHex } from '../util'

describe('rgbaToHex', () => {
  it('should convert rgba values to hex format', () => {
    expect(rgbaToHex({ r: 255, g: 99, b: 71, a: 1 })).toBe('#ff6347ff') // Tomata Red
    expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 1 })).toBe('#000000ff') // Black
    expect(rgbaToHex({ r: 255, g: 255, b: 255, a: 0.5 })).toBe('#ffffff80') // Semi-transparent White
  })

  it('should handle the absence of alpha value', () => {
    expect(rgbaToHex({ r: 255, g: 165, b: 0 })).toBe('#ffa500ff') // Orange
  })
})
