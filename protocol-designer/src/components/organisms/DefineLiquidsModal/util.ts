import type { RGBColor } from 'react-color'

/**
 * Converts an RGBA color object to a hexadecimal string representation.
 *
 * @param {RGBColor} rgba - The RGBA color object.
 * @returns {string} - The hexadecimal string representation of the color, including the alpha component.
 *
 * @example
 * // Returns "#ffa500ff" (alpha defaults to 1)
 * rgbaToHex({ r: 255, g: 165, b: 0 });
 */
export const rgbaToHex = (rgba: RGBColor): string => {
  const { r, g, b, a } = rgba
  const toHex = (n: number): string => n.toString(16).padStart(2, '0')
  const alpha = a != null ? Math.round(a * 255) : 255
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(alpha)}`
}
