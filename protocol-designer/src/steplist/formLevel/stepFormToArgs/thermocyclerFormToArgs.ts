import { THERMOCYCLER_STATE, THERMOCYCLER_PROFILE } from '../../../constants'
import { PROFILE_STEP } from '../../../form-types'
import type {
  ThermocyclerProfileStepArgs,
  ThermocyclerStateStepArgs,
} from '@opentrons/step-generation'
import type {
  HydratedThermocyclerFormData,
  ProfileItem,
  ProfileStepItem,
} from '../../../form-types'
type FlatProfileSteps = ThermocyclerProfileStepArgs['profileSteps']

const _flattenProfileSteps = (args: {
  orderedProfileItems: string[]
  profileItemsById: Record<string, ProfileItem>
}): FlatProfileSteps => {
  const { orderedProfileItems, profileItemsById } = args
  const steps: FlatProfileSteps = []

  const addStep = (step: ProfileStepItem): void => {
    const durationMinutes = Number(step.durationMinutes) || 0
    const durationSeconds = Number(step.durationSeconds) || 0
    steps.push({
      temperature: Number(step.temperature),
      holdTime: durationMinutes * 60 + durationSeconds,
    })
  }

  for (const itemId of orderedProfileItems) {
    const item = profileItemsById[itemId]

    if (item.type === PROFILE_STEP) {
      addStep(item)
    } else {
      const repetitions = Number(item.repetitions)

      for (let i = 0; i < repetitions; i++) {
        for (const step of item.steps) {
          addStep(step)
        }
      }
    }
  }

  return steps
}

export const thermocyclerFormToArgs = (
  formData: HydratedThermocyclerFormData
): ThermocyclerProfileStepArgs | ThermocyclerStateStepArgs | null => {
  const { thermocyclerFormType } = formData

  switch (thermocyclerFormType) {
    case THERMOCYCLER_STATE: {
      return {
        moduleId: formData.moduleId,
        commandCreatorFnName: THERMOCYCLER_STATE,
        blockTargetTemp:
          formData.blockIsActive && formData.blockTargetTemp !== null
            ? Number(formData.blockTargetTemp)
            : null,
        lidTargetTemp:
          formData.lidIsActive && formData.lidTargetTemp !== null
            ? Number(formData.lidTargetTemp)
            : null,
        lidOpen: formData.lidOpen,
      }
    }

    case THERMOCYCLER_PROFILE: {
      const profileSteps = _flattenProfileSteps({
        orderedProfileItems: formData.orderedProfileItems,
        profileItemsById: formData.profileItemsById,
      })

      return {
        moduleId: formData.moduleId,
        commandCreatorFnName: THERMOCYCLER_PROFILE,
        blockTargetTempHold:
          formData.blockIsActiveHold && formData.blockTargetTempHold !== null
            ? Number(formData.blockTargetTempHold)
            : null,
        lidOpenHold: formData.lidOpenHold,
        lidTargetTempHold:
          formData.lidIsActiveHold && formData.lidTargetTempHold !== null
            ? Number(formData.lidTargetTempHold)
            : null,
        meta: {
          rawProfileItems: formData.orderedProfileItems.map(
            (itemId: string | number) => formData.profileItemsById[itemId]
          ),
        },
        profileSteps,
        profileTargetLidTemp: Number(formData.profileTargetLidTemp),
        profileVolume: Number(formData.profileVolume),
      }
    }
  }

  // this should not happen, for Flow only
  return null
}
