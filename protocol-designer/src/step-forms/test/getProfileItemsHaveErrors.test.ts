import { describe, it, expect, vi } from 'vitest'
import { getProfileFieldErrors } from '/protocol-designer/steplist/fieldLevel'
import { getProfileItemsHaveErrors } from '../utils/getProfileItemsHaveErrors'

vi.mock('/protocol-designer/steplist/fieldLevel')

describe('getProfileItemsHaveErrors', () => {
  const testCases = [
    {
      testName: 'should return true if there are errors',
      mockGetProfileFieldErrorsReturn: ['some error'],
      expected: true,
    },
    {
      testName: 'should return false if there are no errors',
      mockGetProfileFieldErrorsReturn: [],
      expected: false,
    },
  ]
  testCases.forEach(
    ({ testName, mockGetProfileFieldErrorsReturn, expected }) => {
      it(testName, () => {
        const profileItems: Record<string, any> = {
          itemA: {
            field1: '1',
            field2: '2',
            field3: '3',
          },
        }
        vi.mocked(getProfileFieldErrors).mockImplementation((name, value) => {
          expect(profileItems.itemA).toHaveProperty(name, value)
          return mockGetProfileFieldErrorsReturn
        })
        const result = getProfileItemsHaveErrors(profileItems)
        expect(result).toBe(expected)
      })
    }
  )
})
