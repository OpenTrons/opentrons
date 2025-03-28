import type { RunTimeCommand } from '@opentrons/shared-data/command'
import type { HandlesCommands } from '../types'

const SIMPLE_TRANSLATION_KEY_BY_COMMAND_TYPE: {
  [commandType in RunTimeCommand['commandType']]?: string
} = {
  home: 'home_gantry',
  savePosition: 'save_position',
  touchTip: 'touch_tip',
  'magneticModule/engage': 'engaging_magnetic_module',
  'magneticModule/disengage': 'disengaging_magnetic_module',
  'temperatureModule/deactivate': 'deactivate_temperature_module',
  'thermocycler/waitForBlockTemperature': 'waiting_for_tc_block_to_reach',
  'thermocycler/waitForLidTemperature': 'waiting_for_tc_lid_to_reach',
  'thermocycler/openLid': 'opening_tc_lid',
  'thermocycler/closeLid': 'closing_tc_lid',
  'thermocycler/deactivateBlock': 'deactivating_tc_block',
  'thermocycler/deactivateLid': 'deactivating_tc_lid',
  'thermocycler/awaitProfileComplete': 'tc_awaiting_for_duration',
  'heaterShaker/deactivateHeater': 'deactivating_hs_heater',
  'heaterShaker/openLabwareLatch': 'unlatching_hs_latch',
  'heaterShaker/closeLabwareLatch': 'latching_hs_latch',
  'heaterShaker/deactivateShaker': 'deactivate_hs_shake',
  'heaterShaker/waitForTemperature': 'waiting_for_hs_to_reach',
}

type HandledCommands = Extract<
  RunTimeCommand,
  { commandType: keyof typeof SIMPLE_TRANSLATION_KEY_BY_COMMAND_TYPE }
>

export type GetDirectTranslationCommandText = HandlesCommands<HandledCommands>

export function getDirectTranslationCommandText({
  command,
  t,
}: GetDirectTranslationCommandText): string {
  const simpleTKey =
    command != null
      ? SIMPLE_TRANSLATION_KEY_BY_COMMAND_TYPE[command.commandType]
      : null

  return simpleTKey != null ? t(simpleTKey) : ''
}
