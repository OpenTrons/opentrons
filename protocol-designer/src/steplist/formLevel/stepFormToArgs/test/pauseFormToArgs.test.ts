import { describe, it, expect } from 'vitest'
import {
  PAUSE_UNTIL_TEMP,
  PAUSE_UNTIL_RESUME,
  PAUSE_UNTIL_TIME,
} from '../../../../constants'
import { pauseFormToArgs } from '../pauseFormToArgs'
import type { HydratedPauseFormData } from '../../../../form-types'

describe('pauseFormToArgs', () => {
  it('returns waitForTemperature command creator when form specifies pause until temp', () => {
    const formData: HydratedPauseFormData = {
      stepType: 'pause',
      id: 'test_id',
      pauseAction: PAUSE_UNTIL_TEMP,
      pauseTemperature: '20',
      pauseMessage: 'pause message',
      moduleId: 'some_id',
      stepName: 'pause step',
      stepDetails: 'some details',
    }
    const expected = {
      commandCreatorFnName: 'waitForTemperature',
      celsius: 20,
      message: 'pause message',
      name: 'pause step',
      description: 'some details',
      moduleId: 'some_id',
    }
    expect(pauseFormToArgs(formData)).toEqual(expected)
  })
  it('returns delay command creator when form specifies pause until resume', () => {
    const formData: HydratedPauseFormData = {
      stepType: 'pause',
      id: 'test_id',
      pauseAction: PAUSE_UNTIL_RESUME,
      pauseMessage: 'some message',
      stepName: 'pause step',
      stepDetails: 'some details',
    }
    const expected = {
      commandCreatorFnName: 'delay',
      name: 'pause step',
      message: 'some message',
      description: 'some details',
      meta: {
        hours: 0,
        minutes: 0,
        seconds: 0,
      },
    }
    expect(pauseFormToArgs(formData)).toEqual(expected)
  })

  it('returns delay command creator when form specifies pause until time', () => {
    const formData: HydratedPauseFormData = {
      stepType: 'pause',
      id: 'test_id',
      pauseAction: PAUSE_UNTIL_TIME,
      pauseMessage: 'some message',
      pauseTime: '01:20:05',
      stepName: 'pause step',
      stepDetails: 'some details',
    }
    const expected = {
      commandCreatorFnName: 'delay',
      name: 'pause step',
      seconds: 3600 + 20 * 60 + 5,
      message: 'some message',
      description: 'some details',
      meta: {
        hours: 1,
        minutes: 20,
        seconds: 5,
      },
    }
    expect(pauseFormToArgs(formData)).toEqual(expected)
  })
})
