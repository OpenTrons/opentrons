import { getProfileFieldErrors } from '/protocol-designer/steplist/fieldLevel'
import { PROFILE_CYCLE } from '/protocol-designer/form-types'
import type { ProfileItem } from '/protocol-designer/form-types'

const _someFieldsHaveErrors = (item: ProfileItem): boolean => {
  for (const fieldName in item) {
    // @ts-expect-error(sa, 2021-6-10): TS thinks fieldName is type string rather than keyof ProfileItem
    const value = item[fieldName]
    const fieldErrors = getProfileFieldErrors(fieldName, value)

    if (fieldErrors.length > 0) {
      return true
    }
  }

  return false
}

export const getProfileItemsHaveErrors = (
  profileItems: Record<string, ProfileItem>
): boolean => {
  // TODO: fieldName includes id, stepType, etc... this is weird #3161
  for (const itemId in profileItems) {
    const item = profileItems[itemId]

    if (_someFieldsHaveErrors(item)) {
      return true
    }

    if (item.type === PROFILE_CYCLE) {
      // we already checked the cycle's own field (eg 'repetitions' field) above
      // but we need to check its steps
      for (const step of item.steps) {
        if (_someFieldsHaveErrors(step)) {
          return true
        }
      }
    }
  }

  return false
}
