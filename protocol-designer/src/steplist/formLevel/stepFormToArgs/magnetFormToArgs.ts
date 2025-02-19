import type {
  EngageMagnetArgs,
  DisengageMagnetArgs,
} from '@opentrons/step-generation'
import type { HydratedMagnetFormData } from '/protocol-designer/form-types'
type MagnetArgs = EngageMagnetArgs | DisengageMagnetArgs
export const magnetFormToArgs = (
  hydratedFormData: HydratedMagnetFormData
): MagnetArgs => {
  const { magnetAction, moduleId, stepDetails, stepName } = hydratedFormData
  //  @ts-expect-error
  const engageHeight = parseFloat(hydratedFormData.engageHeight)
  console.assert(
    magnetAction === 'engage' ? !Number.isNaN(engageHeight) : true,
    'magnetFormToArgs expected (hydrated) engageHeight to be non-NaN if magnetAction is "engage"'
  )

  if (magnetAction === 'engage' && !Number.isNaN(engageHeight)) {
    return {
      commandCreatorFnName: 'engageMagnet',
      moduleId,
      height: engageHeight,
      description: stepDetails,
      name: stepName,
    }
  } else {
    return {
      commandCreatorFnName: 'disengageMagnet',
      moduleId,
      description: stepDetails,
      name: stepName,
    }
  }
}
