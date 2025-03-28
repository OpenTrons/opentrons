import { formatDurationLabeled } from '../formatDuration'
import type { TCRunProfileRunTimeCommand } from '@opentrons/shared-data/command'
import type { GetTCRunProfileCommandTextResult } from '../..'
import type { HandlesCommands } from '../types'

export function getTCRunProfileCommandText({
  command,
  t,
}: HandlesCommands<TCRunProfileRunTimeCommand>): GetTCRunProfileCommandTextResult {
  const { profile } = command.params

  const stepTexts = profile.map(
    ({ holdSeconds, celsius }: { holdSeconds: number; celsius: number }) =>
      t('tc_run_profile_steps', {
        celsius,
        duration: formatDurationLabeled({ seconds: holdSeconds }),
      }).trim()
  )

  const startingProfileText = t('tc_starting_profile', {
    stepCount: Object.keys(stepTexts).length,
  })

  return {
    kind: 'thermocycler/runProfile',
    commandText: startingProfileText,
    stepTexts,
  }
}
