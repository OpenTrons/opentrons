import { intervalToDuration } from 'date-fns'
import { formatDuration } from '@opentrons/components'
/**
 * utility to format a date interval to a hh:mm:ss duration
 * @param start date string
 * @param end date string
 * @returns string in format hh:mm:ss, e.g. 03:15:45
 */
export function formatInterval(start: string, end: string): string {
  const duration = intervalToDuration({
    start: new Date(start),
    end: new Date(end),
  })
  return formatDuration(duration)
}
