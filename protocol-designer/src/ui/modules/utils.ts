import values from 'lodash/values'
import { i18n } from '../../localization'
import {
  MAGNETIC_MODULE_V1,
  getLabwareDefaultEngageHeight,
  ModuleType,
} from '@opentrons/shared-data'
import { Options } from '@opentrons/components'
import {
  ModuleOnDeck,
  LabwareOnDeck,
  InitialDeckSetup,
} from '../../step-forms/types'
export function getModuleOnDeckByType(
  initialDeckSetup: InitialDeckSetup,
  type: ModuleType
): ModuleOnDeck | null | undefined {
  return values(initialDeckSetup.modules).find(
    (moduleOnDeck: ModuleOnDeck) => moduleOnDeck.type === type
  )
}
export function getLabwareOnModule(
  initialDeckSetup: InitialDeckSetup,
  moduleId: string
): LabwareOnDeck | null | undefined {
  return values(initialDeckSetup.labware).find(
    (lab: LabwareOnDeck) => lab.slot === moduleId
  )
}
export function getModuleUnderLabware(
  initialDeckSetup: InitialDeckSetup,
  labwareId: string
): ModuleOnDeck | null | undefined {
  return values(initialDeckSetup.modules).find(
    (moduleOnDeck: ModuleOnDeck) =>
      initialDeckSetup.labware[labwareId]?.slot === moduleOnDeck.id
  )
}
export function getModuleLabwareOptions(
  initialDeckSetup: InitialDeckSetup,
  nicknamesById: Record<string, string>,
  type: ModuleType
): Options {
  const moduleOnDeck = getModuleOnDeckByType(initialDeckSetup, type)
  const labware =
    moduleOnDeck && getLabwareOnModule(initialDeckSetup, moduleOnDeck.id)
  const prefix = i18n.t(`form.step_edit_form.field.moduleLabwarePrefix.${type}`)
  let options: Options = []

  if (moduleOnDeck) {
    if (labware) {
      options = [
        {
          name: `${prefix} ${nicknamesById[labware.id]}`,
          value: moduleOnDeck.id,
        },
      ]
    } else {
      options = [
        {
          name: `${prefix} No labware on module`,
          value: moduleOnDeck.id,
        },
      ]
    }
  }

  return options
}
export function getModuleHasLabware(
  initialDeckSetup: InitialDeckSetup,
  type: ModuleType
): boolean {
  const moduleOnDeck = getModuleOnDeckByType(initialDeckSetup, type)
  const labware =
    moduleOnDeck && getLabwareOnModule(initialDeckSetup, moduleOnDeck.id)
  return Boolean(moduleOnDeck) && Boolean(labware)
}
export const getMagnetLabwareEngageHeight = (
  initialDeckSetup: InitialDeckSetup,
  magnetModuleId: string | null
): number | null => {
  if (magnetModuleId == null) return null
  const moduleModel = initialDeckSetup.modules[magnetModuleId]?.model
  const labware = getLabwareOnModule(initialDeckSetup, magnetModuleId)
  const engageHeightMm = labware
    ? getLabwareDefaultEngageHeight(labware.def)
    : null

  if (engageHeightMm != null && moduleModel === MAGNETIC_MODULE_V1) {
    // convert to 'short mm' units for GEN1
    return engageHeightMm * 2
  }

  return engageHeightMm
}
