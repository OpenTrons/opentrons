import { describe, it, expect } from 'vitest'
import { formatDuration, formatDurationLabeled } from '../formatDuration'

describe('formatDuration', () => {
  it('should format a duration', () => {
    const duration = {
      hours: 2,
      minutes: 40,
      seconds: 2,
    }

    const expected = '02:40:02'

    expect(formatDuration(duration)).toEqual(expected)
  })

  it('should format a short duration with plenty of zeroes', () => {
    const duration = {
      seconds: 2,
    }

    const expected = '00:00:02'

    expect(formatDuration(duration)).toEqual(expected)
  })

  it('should format a longer duration', () => {
    const duration = {
      days: 3,
      hours: 2,
      minutes: 40,
      seconds: 2,
    }

    const expected = '74:40:02'

    expect(formatDuration(duration)).toEqual(expected)
  })

  it('should format a non-normalized duration', () => {
    const duration = {
      seconds: 360002,
    }
    const expected = '100:00:02'
    expect(formatDuration(duration)).toEqual(expected)
  })
})

describe('formatDurationLabeled', () => {
  it('should format a duration', () => {
    const duration = {
      hours: 2,
      minutes: 40,
      seconds: 2,
    }

    const expected = '2h 40m 02s'

    expect(formatDurationLabeled(duration)).toEqual(expected)
  })

  it('should format a short duration with plenty of zeroes', () => {
    const duration = {
      seconds: 2,
    }

    const expected = '0h 00m 02s'

    expect(formatDurationLabeled(duration)).toEqual(expected)
  })

  it('should format a longer duration', () => {
    const duration = {
      days: 3,
      hours: 2,
      minutes: 40,
      seconds: 2,
    }

    const expected = '74h 40m 02s'

    expect(formatDurationLabeled(duration)).toEqual(expected)
  })

  it('should format a non-normalized duration', () => {
    const duration = {
      seconds: 360002,
    }
    const expected = '100h 00m 02s'
    expect(formatDurationLabeled(duration)).toEqual(expected)
  })
})
