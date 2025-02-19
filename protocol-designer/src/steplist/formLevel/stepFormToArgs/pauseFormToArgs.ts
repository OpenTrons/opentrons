import { getTimeFromForm } from '/protocol-designer/steplist/utils/getTimeFromForm'
import {
  PAUSE_UNTIL_TIME,
  PAUSE_UNTIL_TEMP,
  PAUSE_UNTIL_RESUME,
} from '/protocol-designer/constants'
import type { HydratedPauseFormData } from '/protocol-designer/form-types'
import type {
  WaitForTemperatureArgs,
  PauseArgs,
} from '@opentrons/step-generation'

export const pauseFormToArgs = (
  formData: HydratedPauseFormData
): PauseArgs | WaitForTemperatureArgs | null => {
  const { hours, minutes, seconds } = getTimeFromForm(formData, 'pauseTime')
  const totalSeconds = (hours ?? 0) * 3600 + minutes * 60 + seconds
  const temperature = parseFloat(formData.pauseTemperature as string)
  const message = formData.pauseMessage ?? ''

  switch (formData.pauseAction) {
    case PAUSE_UNTIL_TEMP:
      return {
        commandCreatorFnName: 'waitForTemperature',
        name: formData.stepName,
        description: formData.stepDetails ?? '',
        celsius: temperature,
        moduleId: formData.moduleId ?? '',
        message,
      }

    case PAUSE_UNTIL_TIME:
      return {
        commandCreatorFnName: 'delay',
        name: formData.stepName,
        description: formData.stepDetails ?? '',
        seconds: totalSeconds,
        message,
        meta: {
          hours,
          minutes,
          seconds,
        },
      }

    case PAUSE_UNTIL_RESUME:
      return {
        commandCreatorFnName: 'delay',
        name: formData.stepName,
        description: formData.stepDetails ?? '',
        message,
        meta: {
          hours,
          minutes,
          seconds,
        },
      }

    default:
      return null
  }
}
