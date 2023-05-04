import { FormData } from '../../form-types'
import { getFieldErrors } from '../../steplist/fieldLevel'
import {
  _hasFieldLevelErrors,
  getEquippedPipetteOptions,
  getBatchEditFormHasUnsavedChanges,
  getUnsavedFormIsPristineHeaterShakerForm,
  getUnsavedFormIsPristineSetTempForm,
} from '../selectors'
import { getProfileItemsHaveErrors } from '../utils/getProfileItemsHaveErrors'

jest.mock('../../steplist/fieldLevel')
jest.mock('../utils/getProfileItemsHaveErrors')
const mockGetFieldErrors = getFieldErrors as jest.MockedFunction<
  typeof getFieldErrors
>
const mockGetProfileItemsHaveErrors = getProfileItemsHaveErrors as jest.MockedFunction<
  typeof getProfileItemsHaveErrors
>
beforeEach(() => {
  jest.clearAllMocks()
})
describe('_hasFieldLevelErrors', () => {
  it('should return true if form is "thermocycler", has "profileItemsById" field, and _getProfileItemsHaveErrors returns true', () => {
    // @ts-expect-error(sa, 2021-6-14): missing id
    const formData: FormData = {
      stepType: 'thermocycler',
      profileItemsById: {
        foo: 'abc',
      },
    }
    mockGetProfileItemsHaveErrors.mockImplementation(profileItems => {
      expect(profileItems).toEqual(formData.profileItemsById)
      return true
    })

    const result = _hasFieldLevelErrors(formData)

    expect(mockGetProfileItemsHaveErrors).toHaveBeenCalled()
    expect(result).toBe(true)
  })
  const testCases = [
    {
      testName: 'should return true if form has field errors',
      mockGetFieldErrorsReturn: ['some error'],
      expected: true,
    },
    {
      testName: 'should return false if form has no field errors',
      mockGetFieldErrorsReturn: [],
      expected: false,
    },
  ]
  testCases.forEach(({ testName, mockGetFieldErrorsReturn, expected }) => {
    it(testName, () => {
      mockGetFieldErrors.mockImplementation((name, value) => {
        expect(name).toEqual('blah')
        expect(value).toEqual('spam')
        return mockGetFieldErrorsReturn
      })
      const formData: any = {
        blah: 'spam',
      }

      const result = _hasFieldLevelErrors(formData)

      expect(result).toBe(expected)
    })
  })
})
describe('getEquippedPipetteOptions', () => {
  it('appends mount to pipette dropdown when pipettes are same model', () => {
    const initialDeckState = {
      pipettes: {
        123: {
          name: 'p20_single_gen2',
          mount: 'left',
        },
        456: {
          name: 'p20_single_gen2',
          mount: 'right',
        },
      },
    }
    const expected = [
      {
        name: 'P20 Single-Channel GEN2 (L)',
        value: '123',
      },
      {
        name: 'P20 Single-Channel GEN2 (R)',
        value: '456',
      },
    ]
    // @ts-expect-error(sa, 2021-6-14): resultFunc (from reselect) is weirdly not part of their Selector interface
    const result = getEquippedPipetteOptions.resultFunc(initialDeckState)
    expect(result).toEqual(expected)
  })
  it('does NOT append mount to pipette dropdown when pipettes are different models', () => {
    const initialDeckState = {
      pipettes: {
        123: {
          name: 'p300_single_gen2',
          mount: 'left',
        },
        456: {
          name: 'p20_single_gen2',
          mount: 'right',
        },
      },
    }
    const expected = [
      {
        name: 'P300 Single-Channel GEN2',
        value: '123',
      },
      {
        name: 'P20 Single-Channel GEN2',
        value: '456',
      },
    ]
    // @ts-expect-error(sa, 2021-6-14): resultFunc (from reselect) is weirdly not part of their Selector interface
    const result = getEquippedPipetteOptions.resultFunc(initialDeckState)
    expect(result).toEqual(expected)
  })
  it('does NOT append mount to pipette dropdown when only one pipette', () => {
    const initialDeckState = {
      pipettes: {
        123: {
          name: 'p300_single_gen2',
          mount: 'left',
        },
      },
    }
    const expected = [
      {
        name: 'P300 Single-Channel GEN2',
        value: '123',
      },
    ]
    // @ts-expect-error(sa, 2021-6-14): resultFunc (from reselect) is weirdly not part of their Selector interface
    const result = getEquippedPipetteOptions.resultFunc(initialDeckState)
    expect(result).toEqual(expected)
  })
})
describe('getBatchEditFormHasUnsavedChanges', () => {
  it('should return true if there are unsaved changes ', () => {
    expect(
      // @ts-expect-error(sa, 2021-6-14): resultFunc (from reselect) is weirdly not part of their Selector interface
      getBatchEditFormHasUnsavedChanges.resultFunc({
        someField: 'someVal',
      })
    ).toBe(true)
  })
  it('should return false if there are no unsaved changes ', () => {
    // @ts-expect-error(sa, 2021-6-14): resultFunc (from reselect) is weirdly not part of their Selector interface
    expect(getBatchEditFormHasUnsavedChanges.resultFunc({})).toBe(false)
  })
})

describe('getUnsavedFormIsPristineSetTempForm', () => {
  const mockIsPresaved = true
  it('should return true if temperature mod set temp is true formData ', () => {
    // @ts-expect-error(jr, 4/8/22): missing module id
    const formData: FormData = {
      stepType: 'temperature',
      setTemperature: 'true',
    }
    const expected = true
    // @ts-expect-error(jr, 4/8/22): resultFunc (from reselect) is not part of their Selector interface
    const result = getUnsavedFormIsPristineSetTempForm.resultFunc(
      formData,
      mockIsPresaved
    )
    expect(result).toEqual(expected)
  })
  it('should return false if temperature mod is false in formData ', () => {
    // @ts-expect-error(jr, 4/8/22): missing module id
    const formData: FormData = {
      stepType: 'temperature',
      setTemperature: null,
    }
    const expected = false
    // @ts-expect-error(jr, 4/8/22): resultFunc (from reselect) is not part of their Selector interface
    const result = getUnsavedFormIsPristineSetTempForm.resultFunc(
      formData,
      mockIsPresaved
    )
    expect(result).toEqual(expected)
  })
})

describe('getUnsavedFormIsPrestineSetHeaterShakerTempForm', () => {
  const mockIsPresaved = true
  it('should return true if heater shaker temperature is true in formData ', () => {
    // @ts-expect-error(jr, 4/8/22): missing module id
    const formData: FormData = {
      stepType: 'heaterShaker',
      targetHeaterShakerTemperature: '10',
    }
    const expected = true
    // @ts-expect-error(jr, 4/8/22): resultFunc (from reselect) is not part of their Selector interface
    const result = getUnsavedFormIsPristineHeaterShakerForm.resultFunc(
      formData,
      mockIsPresaved
    )
    expect(result).toEqual(expected)
  })
  it('should return false if heater shaker temperature is false in formData ', () => {
    // @ts-expect-error(jr, 4/8/22): missing module id
    const formData: FormData = {
      stepType: 'heaterShaker',
      targetHeaterShakerTemperature: null,
    }
    const expected = false
    // @ts-expect-error(jr, 4/8/22): resultFunc (from reselect) is not part of their Selector interface
    const result = getUnsavedFormIsPristineHeaterShakerForm.resultFunc(
      formData,
      mockIsPresaved
    )
    expect(result).toEqual(expected)
  })
})
