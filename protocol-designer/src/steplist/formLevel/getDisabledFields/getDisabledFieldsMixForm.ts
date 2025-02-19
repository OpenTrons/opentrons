import { DEST_WELL_BLOWOUT_DESTINATION } from '@opentrons/step-generation'
import type { HydratedMixFormData } from '/protocol-designer/form-types'
// NOTE: expects that '_checkbox' fields are implemented so that
// when checkbox is disabled, its dependent fields are hidden
export function getDisabledFieldsMixForm(
  hydratedForm: HydratedMixFormData
): Set<string> {
  const disabled: Set<string> = new Set()

  if (hydratedForm.wells.length === 0 || hydratedForm.pipette == null) {
    disabled.add('pickUpTip_location')
    disabled.add('dropTip_location')
  }

  if (!hydratedForm.pipette || !hydratedForm.labware) {
    disabled.add('mix_touchTip_checkbox')
    disabled.add('mix_mmFromBottom')
    disabled.add('wells')
  }

  if (!hydratedForm.pipette) {
    disabled.add('aspirate_flowRate')
    disabled.add('dispense_flowRate')
  }

  if (
    hydratedForm.labware != null &&
    'isTouchTipAllowed' in hydratedForm.labware &&
    !hydratedForm.labware?.isTouchTipAllowed
  ) {
    disabled.add('mix_touchTip_checkbox')
  }

  if (
    !hydratedForm.blowout_location ||
    hydratedForm.blowout_location.includes('wasteChute') ||
    hydratedForm.blowout_location.includes('trashBin') ||
    (hydratedForm.blowout_location === DEST_WELL_BLOWOUT_DESTINATION &&
      !hydratedForm.labware)
  ) {
    disabled.add('blowout_z_offset')
  }
  return disabled
}
