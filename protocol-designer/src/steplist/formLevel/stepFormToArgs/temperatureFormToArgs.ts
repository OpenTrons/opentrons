import type {
  SetTemperatureArgs,
  DeactivateTemperatureArgs,
} from '@opentrons/step-generation'
import type { HydratedTemperatureFormData } from '../../../form-types'
type TemperatureArgs = SetTemperatureArgs | DeactivateTemperatureArgs
export const temperatureFormToArgs = (
  hydratedFormData: HydratedTemperatureFormData
): TemperatureArgs => {
  const { moduleId, stepName, stepDetails } = hydratedFormData
  // cast values
  const setTemperature = hydratedFormData.setTemperature === 'true'
  // @ts-expect-error(sa, 2021-6-14): null check targetTemperature
  const targetTemperature = parseFloat(hydratedFormData.targetTemperature)
  console.assert(
    setTemperature ? !Number.isNaN(targetTemperature) : true,
    'temperatureFormToArgs expected (hydrated) targetTemperature to be a number when setTemperature is "true"'
  )

  if (setTemperature && !Number.isNaN(targetTemperature)) {
    return {
      commandCreatorFnName: 'setTemperature',
      moduleId: moduleId ?? '',
      celsius: targetTemperature,
      name: stepName,
      description: stepDetails,
    }
  } else {
    return {
      commandCreatorFnName: 'deactivateTemperature',
      moduleId: moduleId ?? '',
      name: stepName,
      description: stepDetails,
    }
  }
}
