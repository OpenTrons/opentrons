import type {
  TemperatureModuleAwaitTemperatureCreateCommand,
  TemperatureModuleSetTargetTemperatureCreateCommand,
  TCSetTargetBlockTemperatureCreateCommand,
  TCSetTargetLidTemperatureCreateCommand,
  HeaterShakerSetTargetTemperatureCreateCommand,
  RunTimeCommand,
} from '@opentrons/shared-data'
import type { HandlesCommands } from '../types'

export type TemperatureCreateCommand =
  | TemperatureModuleSetTargetTemperatureCreateCommand
  | TemperatureModuleAwaitTemperatureCreateCommand
  | TCSetTargetBlockTemperatureCreateCommand
  | TCSetTargetLidTemperatureCreateCommand
  | HeaterShakerSetTargetTemperatureCreateCommand

const T_KEYS_BY_COMMAND_TYPE: {
  [commandType in TemperatureCreateCommand['commandType']]: string
} = {
  'temperatureModule/setTargetTemperature': 'setting_temperature_module_temp',
  'temperatureModule/waitForTemperature': 'waiting_to_reach_temp_module',
  'thermocycler/setTargetBlockTemperature': 'setting_thermocycler_block_temp',
  'thermocycler/setTargetLidTemperature': 'setting_thermocycler_lid_temp',
  'heaterShaker/setTargetTemperature': 'setting_hs_temp',
}

type HandledCommands = Extract<
  RunTimeCommand,
  { commandType: keyof typeof T_KEYS_BY_COMMAND_TYPE }
>

type GetTemperatureCommandText = HandlesCommands<HandledCommands>

export const getTemperatureCommandText = ({
  command,
  t,
}: GetTemperatureCommandText): string => {
  return t(T_KEYS_BY_COMMAND_TYPE[command.commandType], {
    temp:
      command.params?.celsius != null
        ? t('degrees_c', { temp: command.params.celsius })
        : t('target_temperature'),
    hold_time_seconds:
      'holdTimeSeconds' in command.params
        ? command.params.holdTimeSeconds ?? '0'
        : '0',
  })
}
