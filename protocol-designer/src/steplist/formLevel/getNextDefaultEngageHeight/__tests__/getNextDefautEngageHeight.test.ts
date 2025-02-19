import { describe, it, expect } from 'vitest'
import { getNextDefaultEngageHeight } from '../'
import type { StepType } from '/protocol-designer/form-types'

describe('getNextDefaultEngageHeight', () => {
  describe('no previous forms', () => {
    const testCases = [
      {
        testMsg: 'no previous magnet action',
        expected: null,
      },
    ]
    testCases.forEach(({ testMsg, expected }) => {
      it(testMsg, () => {
        const savedForms = {}
        const orderedStepIds: string[] = []
        const result = getNextDefaultEngageHeight(savedForms, orderedStepIds)
        expect(result).toBe(expected)
      })
    })
  })
  describe('with previous forms', () => {
    const testCases = [
      {
        testMsg:
          'returns null when disengage previous selected and no previous engage height entered',
        orderedStepIds: ['d'],
        expected: null,
      },
      {
        testMsg:
          'returns default when disengage previous selected and previous engage height entered',
        orderedStepIds: ['e', 'd', 'e'],
        expected: 14,
      },
      {
        testMsg: 'returns default when engage previous selected',
        orderedStepIds: ['d', 'e', 'd'],
        expected: 14,
      },
    ]
    testCases.forEach(({ testMsg, orderedStepIds, expected }) => {
      it(testMsg, () => {
        const savedForms = {
          e: {
            id: 'moduleId',
            stepType: 'magnet' as StepType,
            magnetAction: 'engage',
            engageHeight: 14,
          },
          d: {
            id: 'moduleId',
            stepType: 'magnet' as StepType,
            magnetAction: 'disengage',
          },
        }
        const result = getNextDefaultEngageHeight(savedForms, orderedStepIds)
        expect(result).toBe(expected)
      })
    })
  })
})
