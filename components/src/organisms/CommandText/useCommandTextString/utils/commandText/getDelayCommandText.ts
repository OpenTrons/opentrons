import type { DeprecatedDelayRunTimeCommand } from '@opentrons/shared-data'
import type { HandlesCommands } from '../types'

export function getDelayCommandText({
  command,
  t,
}: HandlesCommands<DeprecatedDelayRunTimeCommand>): string {
  const { message = '' } = command.params

  if ('waitForResume' in command.params) {
    return command.params?.message != null && command.params.message !== ''
      ? command.params.message
      : t('wait_for_resume')
  } else {
    return t('wait_for_duration', {
      seconds: command.params.seconds,
      message,
    })
  }
}
