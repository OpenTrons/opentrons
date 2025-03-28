import padStart from 'lodash/padStart'
import type { Duration } from 'date-fns'
/**
 * utility to format a date-fns duration object to hh:mm:ss
 * @param duration date-fns duration object
 * @returns string in format hh:mm:ss, e.g. 03:15:45
 */
export function formatDuration(duration: Duration): string {
  const { hours, minutes, seconds } = timestampDetails(duration)

  return `${hours}:${minutes}:${seconds}`
}

export function formatDurationLabeled(duration: Duration): string {
  const { hours, minutes, seconds } = timestampDetails(duration, 1)

  return `${hours}h ${minutes}m ${seconds}s`
}

function timestampDetails(
  duration: Duration,
  padHoursTo?: number
): { hours: string; minutes: string; seconds: string } {
  const paddingWithDefault = padHoursTo ?? 2
  const days = duration?.days ?? 0
  const hours = duration?.hours ?? 0
  const minutes = duration?.minutes ?? 0
  const seconds = duration?.seconds ?? 0

  const totalSeconds = seconds + minutes * 60 + hours * 3600 + days * 24 * 3600

  const normalizedHours = Math.floor(totalSeconds / 3600)
  const normalizedMinutes = Math.floor((totalSeconds % 3600) / 60)
  const normalizedSeconds = totalSeconds % 60

  const paddedHours = padStart(
    normalizedHours.toString(),
    paddingWithDefault,
    '0'
  )
  const paddedMinutes = padStart(normalizedMinutes.toString(), 2, '0')
  const paddedSeconds = padStart(normalizedSeconds.toString(), 2, '0')
  return { hours: paddedHours, minutes: paddedMinutes, seconds: paddedSeconds }
}
