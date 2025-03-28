/**
 * This function performs linear interpolation given a target x-value and an array of [x, y] known interpolation points.
 * linearInterpolate will pre-sort interpolationPoints by x-value. If a value lies left or right of all passed
 * interpolation points, the caller can optionally set a default to return. If no default left or right value is passed,
 * linearInterpolate will return the left- or right-most point, depending on where the target falls.
 *
 * @param {number} target Target x-value for which to interpolate y-value.
 * @param {Array<number, number>} interpolationPoints Array of [x, y] to use for interpolation.
 * @param {number | null} [left] Value to use if target falls left of left-most interpolation point.
 * @param {number | null} [right] Value to use if target falls right of right-most interpolation point.
 *
 * @returns {number | null} Interpolated y-value. Null if empty array of interpolation points passed.
 */
export const linearInterpolate = (
  target: number,
  interpolationPoints: Array<[number, number]>,
  left: number | null = null,
  right: number | null = null
): number | null => {
  console.assert(
    interpolationPoints.length > 0,
    'At least one point required for interpolation'
  )
  if (interpolationPoints.length === 0) {
    return null
  }
  const sortedInterpolationPoints = interpolationPoints.sort((a, b) => {
    const xValueA = a[0]
    const xValueB = b[0]
    if (xValueA > xValueB) {
      return 1
    } else if (xValueA < xValueB) {
      return -1
    } else {
      return 0
    }
  })
  const lastPointIndex = sortedInterpolationPoints.length - 1
  if (sortedInterpolationPoints.length === 1) {
    return sortedInterpolationPoints[0][1]
  }
  if (target < sortedInterpolationPoints[0][0]) {
    return left ?? sortedInterpolationPoints[0][1]
  }
  if (target > sortedInterpolationPoints[lastPointIndex][0]) {
    return right ?? sortedInterpolationPoints[lastPointIndex][1]
  }
  for (let i = 0; i <= lastPointIndex; i++) {
    const bucket = sortedInterpolationPoints.slice(i, i + 2)
    if (target >= bucket[0][0] && target <= bucket[1][0]) {
      const slope =
        (bucket[1][1] - bucket[0][1]) / (bucket[1][0] - bucket[0][0])
      const yIntercept = bucket[0][1] - slope * bucket[0][0]
      return slope * target + yIntercept
    }
  }
  // should never hit
  console.warn('Unable to interpolate')
  return null
}
