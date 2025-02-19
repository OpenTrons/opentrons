import { describe, it, expect } from 'vitest'
import { getNextDefaultMagnetAction } from '../'
import type { StepType } from '/protocol-designer/form-types'

describe('getNextDefaultMagnetAction', () => {
  describe('no previous forms defaults to engage', () => {
    const testCases = [
      {
        testMsg: 'no previous magnet action',
        expected: 'engage',
      },
    ]
    testCases.forEach(({ testMsg, expected }) => {
      it(testMsg, () => {
        const savedForms = {}
        const orderedStepIds: string[] = []
        const result = getNextDefaultMagnetAction(savedForms, orderedStepIds)
        expect(result).toBe(expected)
      })
    })
  })
  describe('with previous forms', () => {
    const testCases = [
      {
        testMsg: 'returns disengage when engage previous selected',
        orderedStepIds: ['e', 'd', 'e'],
        expected: 'disengage',
      },
      {
        testMsg: 'returns engage when disengage previous selected',
        orderedStepIds: ['d', 'e', 'd'],
        expected: 'engage',
      },
    ]
    testCases.forEach(({ testMsg, orderedStepIds, expected }) => {
      it(testMsg, () => {
        const savedForms: Record<
          string,
          {
            id: string
            stepType: StepType
            magnetAction: string
          }
        > = {
          e: {
            id: 'moduleId',
            stepType: 'magnet',
            magnetAction: 'engage',
          },
          d: {
            id: 'moduleId',
            stepType: 'magnet',
            magnetAction: 'disengage',
          },
        }
        const result = getNextDefaultMagnetAction(savedForms, orderedStepIds)
        expect(result).toBe(expected)
      })
    })
  })
})
