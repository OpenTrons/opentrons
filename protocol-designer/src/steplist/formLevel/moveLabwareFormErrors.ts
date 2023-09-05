import { LabwareLocation } from '@opentrons/shared-data'
import { i18n } from '../../localization'
import {
  COMPATIBLE_LABWARE_ALLOWLIST_BY_MODULE_TYPE,
  COMPATIBLE_LABWARE_ALLOWLIST_FOR_ADAPTER,
} from '../../utils/labwareModuleCompatibility'
import type {
  InvariantContext,
  LabwareEntity,
} from '@opentrons/step-generation'
import type { ProfileFormError } from './profileErrors'

type HydratedFormData = any

const getMoveLabwareError = (
  labware: LabwareEntity,
  newLocation: LabwareLocation,
  invariantContext: InvariantContext
): string | null => {
  let errorString: string | null = null
  if (labware == null || newLocation == null || newLocation === 'offDeck')
    return null
  const selectedLabwareDefUri = labware?.labwareDefURI
  if ('moduleId' in newLocation) {
    const loadName = labware?.def.parameters.loadName
    const moduleType =
      invariantContext.moduleEntities[newLocation.moduleId].type
    const modAllowList = COMPATIBLE_LABWARE_ALLOWLIST_BY_MODULE_TYPE[moduleType]
    errorString = !modAllowList.includes(loadName)
      ? i18n.t(
          'form.step_edit_form.labwareLabel.errors.labwareIncompatibleWithMod'
        )
      : null
  } else if ('labwareId' in newLocation) {
    const adapterValueDefUri =
      invariantContext.labwareEntities[newLocation.labwareId].def.parameters
        .loadName
    const adapterAllowList =
      COMPATIBLE_LABWARE_ALLOWLIST_FOR_ADAPTER[adapterValueDefUri]
    errorString = !adapterAllowList?.includes(selectedLabwareDefUri)
      ? i18n.t(
          'form.step_edit_form.labwareLabel.errors.labwareIncompatibleWithAdapter'
        )
      : null
  }
  return errorString
}

export const getMoveLabwareFormErrors = (
  hydratedForm: HydratedFormData,
  invariantContext: InvariantContext
): ProfileFormError[] => {
  if (hydratedForm.stepType !== 'moveLabware') {
    return []
  }

  const labware = hydratedForm.labware as LabwareEntity
  const newLocation = hydratedForm.newLocation as LabwareLocation

  const errorString = getMoveLabwareError(
    labware,
    newLocation,
    invariantContext
  )

  return errorString != null
    ? ([
        {
          title: errorString,
          dependentProfileFields: [],
        },
      ] as ProfileFormError[])
    : []
}
