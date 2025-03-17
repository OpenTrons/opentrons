import {
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
} from '@opentrons/shared-data'
import { uuid } from '../../utils'
import * as errorCreators from '../../errorCreators'
import type { ModuleOnlyParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'

/** Disengage temperature target for specified module. */
export const deactivateTemperature: CommandCreator<ModuleOnlyParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { moduleId } = args

  if (moduleId === null) {
    return {
      errors: [errorCreators.missingModuleError()],
    }
  }
  const module = invariantContext.moduleEntities[moduleId]
  const type = module?.type
  const pythonName = module?.pythonName

  const params = {
    moduleId,
  }

  if (type === TEMPERATURE_MODULE_TYPE) {
    return {
      commands: [
        {
          commandType: 'temperatureModule/deactivate',
          key: uuid(),
          params,
        },
      ],
      python: `${pythonName}.deactivate()`,
    }
  } else if (type === THERMOCYCLER_MODULE_TYPE) {
    return {
      commands: [
        {
          commandType: 'thermocycler/deactivateLid',
          key: uuid(),
          params,
        },
        {
          commandType: 'thermocycler/deactivateBlock',
          key: uuid(),
          params,
        },
      ],
      python: `${pythonName}.deactivate_lid()\n${pythonName}.deactivate_block()`,
    }
  } else if (type === HEATERSHAKER_MODULE_TYPE) {
    return {
      commands: [
        {
          commandType: 'heaterShaker/deactivateHeater',
          key: uuid(),
          params,
        },
      ],
      python: `${pythonName}.deactivate_heater()`,
    }
  } else {
    console.error(
      `setTemperature expected module ${moduleId} to be ${TEMPERATURE_MODULE_TYPE}, ${THERMOCYCLER_MODULE_TYPE} or ${HEATERSHAKER_MODULE_TYPE}, got ${type}`
    )
    // NOTE: "missing module" isn't exactly the right error here, but better than a whitescreen!
    // This should never be shown.
    return {
      errors: [errorCreators.missingModuleError()],
    }
  }
}
