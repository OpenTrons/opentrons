import { describe, it, expect } from 'vitest'
import { prefixMap } from '..'

describe('prefixMap', () => {
  it('should have correct mappings for aspirate', () => {
    expect(prefixMap.aspirate).toBe('aspirate')
  })

  it('should have correct mappings for dispense', () => {
    expect(prefixMap.dispense).toBe('dispense')
  })

  it('should have correct mappings for mix', () => {
    expect(prefixMap.mix).toBe('mix')
  })

  it('should have correct mappings for aspirate_retract', () => {
    expect(prefixMap.aspirate_retract).toBe('retract')
  })

  it('should have correct mappings for dispense_retract', () => {
    expect(prefixMap.dispense_retract).toBe('retract')
  })
})
