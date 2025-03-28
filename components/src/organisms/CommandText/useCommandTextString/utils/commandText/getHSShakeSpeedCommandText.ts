import type { HeaterShakerSetAndWaitForShakeSpeedRunTimeCommand } from '@opentrons/shared-data/command'
import type { HandlesCommands } from '../types'

export function getHSShakeSpeedCommandText({
  command,
  t,
}: HandlesCommands<HeaterShakerSetAndWaitForShakeSpeedRunTimeCommand>): string {
  const { rpm } = command.params

  return t('set_and_await_hs_shake', { rpm })
}
