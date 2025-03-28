import type {
  AbsorbanceReaderOpenLidRunTimeCommand,
  AbsorbanceReaderCloseLidRunTimeCommand,
  AbsorbanceReaderInitializeRunTimeCommand,
  AbsorbanceReaderReadRunTimeCommand,
  RunTimeCommand,
} from '@opentrons/shared-data'
import type { HandlesCommands } from '../types'

export type AbsorbanceCreateCommand =
  | AbsorbanceReaderOpenLidRunTimeCommand
  | AbsorbanceReaderCloseLidRunTimeCommand
  | AbsorbanceReaderInitializeRunTimeCommand
  | AbsorbanceReaderReadRunTimeCommand

const KEYS_BY_COMMAND_TYPE: {
  [commandType in AbsorbanceCreateCommand['commandType']]: string
} = {
  'absorbanceReader/openLid': 'absorbance_reader_open_lid',
  'absorbanceReader/closeLid': 'absorbance_reader_close_lid',
  'absorbanceReader/initialize': 'absorbance_reader_initialize',
  'absorbanceReader/read': 'absorbance_reader_read',
}

type HandledCommands = Extract<
  RunTimeCommand,
  { commandType: keyof typeof KEYS_BY_COMMAND_TYPE }
>

type GetAbsorbanceReaderCommandText = HandlesCommands<HandledCommands>

export const getAbsorbanceReaderCommandText = ({
  command,
  t,
}: GetAbsorbanceReaderCommandText): string => {
  if (command.commandType === 'absorbanceReader/initialize') {
    const wavelengths = command.params.sampleWavelengths.join(' nm, ') + ` nm`
    const mode =
      command.params.measureMode === 'multi' ? t('multiple') : t('single')

    return `${t('absorbance_reader_initialize', {
      mode,
      wavelengths,
    })} ${
      command.params.referenceWavelength != null
        ? t('with_reference_of', {
            wavelength: command.params.referenceWavelength,
          })
        : ''
    }`
  }
  return t(KEYS_BY_COMMAND_TYPE[command.commandType])
}
