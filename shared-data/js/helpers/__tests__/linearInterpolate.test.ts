import { describe, expect, it } from 'vitest'
import { linearInterpolate } from '../linearInterpolate'

describe('linearInterpolate', () => {
  it('returns only value if length of interpolationPoints is 1', () => {
    const result = linearInterpolate(10, [[5, 20]])
    expect(result).toEqual(20)
  })
  it('returns first point value if target < first interpolationPoint value', () => {
    const result = linearInterpolate(1, [
      [5, 20],
      [10, 100],
    ])
    expect(result).toEqual(20)
  })
  it('returns first point value if target equals first interpolationPoint value', () => {
    const result = linearInterpolate(5, [
      [5, 20],
      [10, 100],
    ])
    expect(result).toEqual(20)
  })
  it('returns `left` value if target < first interpolationPoint value and `left` is defined', () => {
    const result = linearInterpolate(
      4,
      [
        [5, 20],
        [10, 100],
      ],
      1
    )
    expect(result).toEqual(1)
  })
  it('returns last point value if target > last interpolationPoint value', () => {
    const result = linearInterpolate(12, [
      [5, 20],
      [10, 100],
    ])
    expect(result).toEqual(100)
  })
  it('returns last point value if target equals last interpolationPoint value', () => {
    const result = linearInterpolate(10, [
      [5, 20],
      [10, 100],
    ])
    expect(result).toEqual(100)
  })
  it('returns `right` value if target > last interpolationPoint value and `right` is defined', () => {
    const result = linearInterpolate(
      11,
      [
        [5, 20],
        [10, 100],
      ],
      null,
      1000
    )
    expect(result).toEqual(1000)
  })
  it('correctly interpolates if target matches an interpolation points', () => {
    const result = linearInterpolate(10, [
      [5, 20],
      [10, 100],
      [50, 120],
    ])
    expect(result).toEqual(100)
  })
  it('correctly interpolates if between two interpolation points', () => {
    const result = linearInterpolate(8, [
      [5, 20],
      [10, 100],
      [50, 120],
    ])
    expect(result).toEqual(68)
  })
  it('correctly sorts and interpolates if between two interpolation points for unsorted input points', () => {
    const result = linearInterpolate(8, [
      [50, 120],
      [5, 20],
      [10, 100],
    ])
    expect(result).toEqual(68)
  })
  it('returns null if no points passed', () => {
    const result = linearInterpolate(10, [])
    expect(result).toEqual(null)
  })
})
