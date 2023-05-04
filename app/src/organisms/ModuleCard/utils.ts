import heaterShakerModule from '../../assets/images/heater_shaker_module_transparent.png'
import magneticModule from '../../assets/images/magnetic_module_gen_2_transparent.png'
import temperatureModule from '../../assets/images/temp_deck_gen_2_transparent.png'
import thermoModuleGen1Closed from '../../assets/images/thermocycler_closed.png'
import thermoModuleGen2Closed from '../../assets/images/thermocycler_gen_2_closed.png'
import thermoModuleGen2Opened from '../../assets/images/thermocycler_gen_2_opened.png'
import thermoModuleGen1Opened from '../../assets/images/thermocycler_open_transparent.png'
import type { AttachedModule } from '../../redux/modules/types'

export function getModuleCardImage(attachedModule: AttachedModule): string {
  //  TODO(jr, 9/22/22): add images for V1 of magneticModule and temperatureModule
  switch (attachedModule.moduleModel) {
    case 'magneticModuleV1':
    case 'magneticModuleV2':
      return magneticModule
    case 'temperatureModuleV1':
    case 'temperatureModuleV2':
      return temperatureModule
    case 'heaterShakerModuleV1':
      return heaterShakerModule
    case 'thermocyclerModuleV1':
      if (attachedModule.data.lidStatus === 'closed') {
        return thermoModuleGen1Closed
      } else {
        return thermoModuleGen1Opened
      }
    case 'thermocyclerModuleV2':
      if (attachedModule.data.lidStatus === 'closed') {
        return thermoModuleGen2Closed
      } else {
        return thermoModuleGen2Opened
      }
    //  this should never be reached
    default:
      return 'unknown module model, this is an error'
  }
}
