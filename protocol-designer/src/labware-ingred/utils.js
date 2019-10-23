// @flow
import { sortedSlotnames } from '@opentrons/components'
import type { DeckSlot } from '../types'

export function getNextAvailableSlot(labwareLocations: {
  [labwareId: string]: DeckSlot,
}): ?DeckSlot {
  const filledLocations = Object.values(labwareLocations)
  return sortedSlotnames.find(
    slot => !filledLocations.some(filledSlot => filledSlot === slot)
  )
}

const getMatchOrNull = (pattern: RegExp, s: string): ?string => {
  const matchResult = pattern.exec(s)
  return matchResult ? matchResult[1] : null
}

const nameOnlyPattern = /^(.*)\(\d+\)$/
const numOnlyPattern = /^.*\((\d+)\)$/
export function getNextNickname(
  allNicknames: Array<string>,
  _proposedNickname: string
): string {
  const proposedNickname = (
    getMatchOrNull(nameOnlyPattern, _proposedNickname) || _proposedNickname
  ).trim()
  const matchingDisambigNums = allNicknames.reduce<Array<number>>(
    (acc, nickname) => {
      const nameOnly = (
        getMatchOrNull(nameOnlyPattern, nickname) || nickname
      ).trim()

      const numOnlyMatch = getMatchOrNull(numOnlyPattern, nickname)
      const num = numOnlyMatch ? Number(numOnlyMatch) : 0

      // only include matching names
      if (nameOnly === proposedNickname) {
        return [...acc, num]
      }
      return acc
    },
    []
  )

  const topMatchNum = Math.max(...matchingDisambigNums)
  return Number.isFinite(topMatchNum)
    ? `${proposedNickname.trim()} (${topMatchNum + 1})`
    : proposedNickname
}
