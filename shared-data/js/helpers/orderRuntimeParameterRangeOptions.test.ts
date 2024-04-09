import { describe, it, expect } from 'vitest'
import type { Choice } from '../types'

import {
  isNumeric,
  orderRuntimeParameterRangeOptions,
} from './orderRuntimeParameterRangeOptions'

describe('isNumeric', () => {
  it('should return true when input is "2"', () => {
    const result = isNumeric('2')
    expect(result).toBeTruthy()
  })

  it('should return false when input is "opentrons"', () => {
    const result = isNumeric('opentrons')
    expect(result).toBeFalsy()
  })
})

describe('orderRuntimeParameterRangeOptions', () => {
  it('should return numerical order when choices are number', () => {
    const mockChoices: Choice[] = [
      { displayName: '20', value: 20 },
      { displayName: '16', value: 16 },
    ]
    const result = orderRuntimeParameterRangeOptions(mockChoices)
    expect(result).toEqual('16, 20')
  })

  it('should return alphabetical order when choices are number', () => {
    const mockChoices: Choice[] = [
      { displayName: 'Single channel 50µL', value: 'flex_1channel_50' },
      { displayName: 'Eight Channel 50µL', value: 'flex_8channel_50' },
    ]
    const result = orderRuntimeParameterRangeOptions(mockChoices)
    expect(result).toEqual('Eight Channel 50µL, Single channel 50µL')
  })
})
