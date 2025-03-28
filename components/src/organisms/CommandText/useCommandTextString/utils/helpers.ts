export const findLastAt = <T, U extends T = T>(
  arr: readonly T[],
  pred: ((el: T) => boolean) | ((el: T) => el is U)
): [U, number] | [undefined, -1] => {
  let arrayLoc = -1
  const lastEl = arr.findLast((el: T, idx: number): el is U => {
    arrayLoc = idx
    return pred(el)
  })
  if (lastEl === undefined) {
    return [undefined, -1]
  } else {
    return [lastEl, arrayLoc]
  }
}
