import { createSelector } from 'reselect'
import mapValues from 'lodash/mapValues'
import {
  ABSORBANCE_READER_TYPE,
  getLabwareDisplayName,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
} from '@opentrons/shared-data'
import { getInitialDeckSetup } from '/protocol-designer/step-forms/selectors'
import { getDeckSetupForActiveItem } from '/protocol-designer/top-selectors/labware-locations'
import { getLabwareNicknamesById } from '../labware/selectors'
import {
  getModuleLabwareOptions,
  getLabwareOnModule,
  getModuleOnDeckByType,
  getMagnetLabwareEngageHeight as getMagnetLabwareEngageHeightUtil,
  getModulesOnDeckByType,
} from './utils'
import type { DropdownOption } from '@opentrons/components'
import type { Selector } from '/protocol-designer/types'
import type { LabwareNamesByModuleId } from '/protocol-designer/steplist/types'

export const getLabwareNamesByModuleId: Selector<LabwareNamesByModuleId> = createSelector(
  getInitialDeckSetup,
  getLabwareNicknamesById,
  (initialDeckSetup, nicknamesById) =>
    mapValues(initialDeckSetup.modules, (_, moduleId) => {
      const labware = getLabwareOnModule(initialDeckSetup, moduleId)
      return labware
        ? {
            nickname: nicknamesById[labware.id],
            displayName: getLabwareDisplayName(labware.def),
          }
        : null
    })
)

/** Returns dropdown option for labware placed on magnetic module */
export const getMagneticLabwareOptions: Selector<
  DropdownOption[]
> = createSelector(
  getInitialDeckSetup,
  getLabwareNicknamesById,
  (initialDeckSetup, nicknamesById) => {
    return getModuleLabwareOptions(
      initialDeckSetup,
      nicknamesById,
      MAGNETIC_MODULE_TYPE
    )
  }
)

/** Returns dropdown option for labware placed on temperature module */
export const getTemperatureLabwareOptions: Selector<
  DropdownOption[]
> = createSelector(
  getInitialDeckSetup,
  getLabwareNicknamesById,
  (initialDeckSetup, nicknamesById) => {
    const temperatureModuleOptions = getModuleLabwareOptions(
      initialDeckSetup,
      nicknamesById,
      TEMPERATURE_MODULE_TYPE
    )
    return temperatureModuleOptions
  }
)

/** Returns dropdown option for labware placed on heater shaker module */
export const getHeaterShakerLabwareOptions: Selector<
  DropdownOption[]
> = createSelector(
  getInitialDeckSetup,
  getLabwareNicknamesById,
  (initialDeckSetup, nicknamesById) => {
    const heaterShakerModuleOptions = getModuleLabwareOptions(
      initialDeckSetup,
      nicknamesById,
      HEATERSHAKER_MODULE_TYPE
    )
    return heaterShakerModuleOptions
  }
)

/** Returns dropdown option for labware placed on absorbance reader module */
export const getAbsorbanceReaderLabwareOptions: Selector<
  DropdownOption[]
> = createSelector(
  getDeckSetupForActiveItem,
  getLabwareNicknamesById,
  (deckSetup, nicknamesById) => {
    const absorbanceReaderModuleOptions = getModuleLabwareOptions(
      deckSetup,
      nicknamesById,
      ABSORBANCE_READER_TYPE
    )
    return absorbanceReaderModuleOptions
  }
)

/** Get single magnetic module (assumes no multiples) */
export const getSingleMagneticModuleId: Selector<
  string | null
> = createSelector(
  getInitialDeckSetup,
  initialDeckSetup =>
    getModuleOnDeckByType(initialDeckSetup, MAGNETIC_MODULE_TYPE)?.id || null
)

/** Get all temperature modules */
export const getTemperatureModuleIds: Selector<
  string[] | null
> = createSelector(
  getInitialDeckSetup,
  initialDeckSetup =>
    getModulesOnDeckByType(initialDeckSetup, TEMPERATURE_MODULE_TYPE)?.map(
      module => module.id
    ) || null
)
export const getMagnetLabwareEngageHeight: Selector<
  number | null
> = createSelector(
  getInitialDeckSetup,
  getSingleMagneticModuleId,
  (initialDeckSetup, magnetModuleId) =>
    getMagnetLabwareEngageHeightUtil(initialDeckSetup, magnetModuleId)
)
