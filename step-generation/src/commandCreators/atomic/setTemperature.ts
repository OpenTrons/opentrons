import {
  HEATERSHAKER_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import { uuid } from '../../utils'
import * as errorCreators from '../../errorCreators'
import type { TemperatureParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'

/** Set temperature target for specified module. */
export const setTemperature: CommandCreator<TemperatureParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { moduleId, celsius } = args
  if (moduleId === null) {
    return {
      errors: [errorCreators.missingModuleError()],
    }
  }
  const module = invariantContext.moduleEntities[moduleId]
  const moduleType = module?.type

  if (moduleType === TEMPERATURE_MODULE_TYPE) {
    return {
      commands: [
        {
          commandType: 'temperatureModule/setTargetTemperature',
          key: uuid(),
          params: {
            moduleId,
            celsius,
          },
        },
      ],
      python: `${module?.pythonName}.start_set_temperature(${celsius})`,
    }
  } else if (moduleType === THERMOCYCLER_MODULE_TYPE) {
    // TODO: Ian 2019-01-24 implement setting thermocycler temp: block vs lid
    console.error('Thermocycler set temp not implemented!')
    return {
      commands: [],
    }
  } else if (moduleType === HEATERSHAKER_MODULE_TYPE) {
    return {
      commands: [
        {
          commandType: 'heaterShaker/setTargetTemperature',
          key: uuid(),
          params: {
            moduleId,
            celsius,
          },
        },
      ],
      python: `${module?.pythonName}.set_target_temperature(${celsius})`,
    }
  } else {
    console.error(
      `setTemperature expected module ${moduleId} to be ${TEMPERATURE_MODULE_TYPE}, ${THERMOCYCLER_MODULE_TYPE} or ${HEATERSHAKER_MODULE_TYPE}, got ${moduleType}`
    )
    // NOTE: "missing module" isn't exactly the right error here, but better than a whitescreen!
    // This should never be shown.
    return {
      errors: [errorCreators.missingModuleError()],
    }
  }
}
