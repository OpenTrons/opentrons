// @flow
import { createSelector } from 'reselect'
import sortBy from 'lodash/sortBy'

import { selectors as RobotSelectors } from '../robot'
import * as Types from './types'

import type { State } from '../types'
import type { SessionModule } from '../robot/types'
import { PREPARABLE_MODULE_TYPES } from './constants'
import {
  THERMOCYCLER_MODULE_TYPE,
  getModuleType,
  checkModuleCompatibility,
} from '@opentrons/shared-data'
import type { ModuleModel } from '@opentrons/shared-data'

export { getModuleType } from '@opentrons/shared-data'

export const getAttachedModules: (
  state: State,
  robotName: string | null
) => Array<Types.AttachedModule> = createSelector(
  (state, robotName) =>
    robotName !== null ? state.modules[robotName]?.modulesById : {},
  modulesById => sortBy(modulesById, 'serial')
)

export const getAttachedModulesForConnectedRobot = (
  state: State
): Array<Types.AttachedModule> => {
  const robotName = RobotSelectors.getConnectedRobotName(state)
  return getAttachedModules(state, robotName)
}

const isModulePrepared = (module: Types.AttachedModule): boolean => {
  if (module.type === THERMOCYCLER_MODULE_TYPE)
    return module.data.lid === 'open'
  return false
}

export const getUnpreparedModules: (
  state: State
) => Array<Types.AttachedModule> = createSelector(
  getAttachedModulesForConnectedRobot,
  RobotSelectors.getModules,
  (attachedModules, protocolModules) => {
    const preparableSessionModules = protocolModules
      .filter(m => PREPARABLE_MODULE_TYPES.includes(getModuleType(m.model)))
      .map(m => m.model)

    // return actual modules that are both
    // a) required to be prepared by the session
    // b) not prepared according to isModulePrepared
    return attachedModules.filter(
      m => preparableSessionModules.includes(m.model) && !isModulePrepared(m)
    )
  }
)

export const getMissingModules: (
  state: State
) => Array<SessionModule> = createSelector(
  getAttachedModulesForConnectedRobot,
  RobotSelectors.getModules,
  (attachedModules, protocolModules) => {
    const compatibleCount: { [ModuleModel]: number } = Object.fromEntries(
      protocolModules.map(pmod => {
        const compatible = attachedModules
          .map((amod): Types.AttachedModule | null => {
            return checkModuleCompatibility(amod.model, pmod.model)
              ? amod
              : null
          })
          .filter(a => a !== null)
        return [pmod.model, compatible.length]
      })
    )
    return protocolModules.filter(m => compatibleCount[m.model] === 0)
  }
)
