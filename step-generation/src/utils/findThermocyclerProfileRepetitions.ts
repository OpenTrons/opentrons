import type { AtomicProfileStep } from '@opentrons/shared-data'

interface thermocyclerProfileRepititions {
  repeatingProfileSteps: AtomicProfileStep[]
  numRepetitions: number
}

export function findThermocyclerProfileRepetitions(
  profile: AtomicProfileStep[]
): thermocyclerProfileRepititions {
  // Convert each object into a string to easily compare
  const patternStrings = profile.map(
    step => `${step.holdSeconds}-${step.celsius}`
  )

  const stepLength = patternStrings.length

  // Check for the repeating patterns
  for (let size = 1; size <= stepLength / 2; size++) {
    const pattern = patternStrings.slice(0, size).join(',')
    let isRepeating = true
    let count = 0

    for (let i = 0; i < stepLength; i += size) {
      const chunk = patternStrings.slice(i, i + size).join(',')
      if (chunk !== pattern) {
        isRepeating = false
        break
      }
      count++
    }

    if (isRepeating) {
      return {
        repeatingProfileSteps: profile.slice(0, size), // Get original pattern in AtomicProfileStep form
        numRepetitions: count,
      }
    }
  }

  return {
    repeatingProfileSteps: profile,
    numRepetitions: 1,
  }
}
