import { describe, expect, it } from 'vitest'
import { findThermocyclerProfileRepetitions } from '../utils'

describe('findThermocyclerProfileRepititions', () => {
  it('has 2 repetitions', () => {
    const args = [
      { holdSeconds: 50, celsius: 50 },
      { holdSeconds: 60, celsius: 60 },
      { holdSeconds: 50, celsius: 50 },
      { holdSeconds: 60, celsius: 60 },
    ]
    expect(findThermocyclerProfileRepetitions(args)).toEqual({
      repeatingProfileSteps: [
        { holdSeconds: 50, celsius: 50 },
        { holdSeconds: 60, celsius: 60 },
      ],
      numRepetitions: 2,
    })
  })
  it('has 1 repetition', () => {
    const args = [
      { holdSeconds: 50, celsius: 50 },
      { holdSeconds: 60, celsius: 60 },
      { holdSeconds: 80, celsius: 10 },
      { holdSeconds: 60, celsius: 60 },
    ]
    expect(findThermocyclerProfileRepetitions(args)).toEqual({
      repeatingProfileSteps: [
        { holdSeconds: 50, celsius: 50 },
        { holdSeconds: 60, celsius: 60 },
        { holdSeconds: 80, celsius: 10 },
        { holdSeconds: 60, celsius: 60 },
      ],
      numRepetitions: 1,
    })
  })
  it('has 5 repetitions', () => {
    const args = [
      { holdSeconds: 50, celsius: 50 },
      { holdSeconds: 50, celsius: 50 },
      { holdSeconds: 50, celsius: 50 },
      { holdSeconds: 50, celsius: 50 },
      { holdSeconds: 50, celsius: 50 },
    ]
    expect(findThermocyclerProfileRepetitions(args)).toEqual({
      repeatingProfileSteps: [{ holdSeconds: 50, celsius: 50 }],
      numRepetitions: 5,
    })
  })
})
