import { describe, it, expect } from 'vitest'
import { THERMOCYCLER_PROFILE, THERMOCYCLER_STATE } from '../../../../constants'
import { getDefaultsForStepType } from '../../getDefaultsForStepType'
import { thermocyclerFormToArgs } from '../thermocyclerFormToArgs'
import type {
  ThermocyclerStateStepArgs,
  ThermocyclerProfileStepArgs,
} from '@opentrons/step-generation'
import type { HydratedThermocyclerFormData } from '../../../../form-types'
const tcModuleId = 'tcModuleId'

describe('thermocyclerFormToArgs', () => {
  const testCases: Array<{
    formData: HydratedThermocyclerFormData
    expected: ThermocyclerStateStepArgs | ThermocyclerProfileStepArgs
    testName: string
  }> = [
    {
      testName: 'all active temps',
      formData: {
        ...getDefaultsForStepType('thermocycler'),
        stepType: 'thermocycler',
        id: 'testId',
        moduleId: tcModuleId,
        thermocyclerFormType: THERMOCYCLER_STATE,
        blockIsActive: true,
        blockTargetTemp: '45',
        lidIsActive: true,
        lidTargetTemp: '40',
        lidOpen: false,
        blockIsActiveHold: false,
        lidIsActiveHold: false,
        lidOpenHold: false,
        blockTargetTempHold: null,
        lidTargetTempHold: null,
        orderedProfileItems: [],
        profileItemsById: {},
        profileTargetLidTemp: null,
        profileVolume: '10',
        stepName: 'mock name',
        stepDetails: 'mock details',
      },
      expected: {
        commandCreatorFnName: THERMOCYCLER_STATE,

        moduleId: tcModuleId,
        blockTargetTemp: 45,
        lidTargetTemp: 40,
        lidOpen: false,
      },
    },
    {
      testName: 'inactive block',
      formData: {
        ...getDefaultsForStepType('thermocycler'),
        stepType: 'thermocycler',
        id: 'testId',

        moduleId: tcModuleId,
        thermocyclerFormType: THERMOCYCLER_STATE,
        blockIsActive: false,
        blockTargetTemp: '9999',
        lidIsActive: true,
        lidTargetTemp: '40',
        lidOpen: false,
        blockIsActiveHold: false,
        lidIsActiveHold: false,
        lidOpenHold: false,
        blockTargetTempHold: null,
        lidTargetTempHold: null,
        orderedProfileItems: [],
        profileItemsById: {},
        profileTargetLidTemp: null,
        profileVolume: '10',
        stepName: 'mock name',
        stepDetails: 'mock details',
      },
      expected: {
        commandCreatorFnName: THERMOCYCLER_STATE,

        moduleId: tcModuleId,
        blockTargetTemp: null,
        lidTargetTemp: 40,
        lidOpen: false,
      },
    },
    {
      testName: 'profile with cycles',
      formData: {
        ...getDefaultsForStepType('thermocycler'),
        stepType: 'thermocycler',
        id: 'testId',
        stepName: 'mock name',
        stepDetails: 'mock details',
        moduleId: tcModuleId,
        thermocyclerFormType: THERMOCYCLER_PROFILE,
        blockTargetTemp: '9999',
        lidIsActive: true,
        lidTargetTemp: '40',
        lidOpen: false,
        profileVolume: '4',
        profileTargetLidTemp: '40',
        orderedProfileItems: ['profileItem1', 'profileItem2'],
        profileItemsById: {
          profileItem1: {
            type: 'profileStep',
            id: 'profileItem1',
            title: 'Top level step',
            temperature: '5',
            durationMinutes: '',
            durationSeconds: '50',
          },
          profileItem2: {
            id: 'profileItem2',
            type: 'profileCycle',
            repetitions: '2',
            steps: [
              {
                type: 'profileStep',
                id: 'item2A',
                title: 'Step A in cycle',
                temperature: '12',
                durationMinutes: '1',
                durationSeconds: '2',
              },
              {
                type: 'profileStep',
                id: 'item2B',
                title: 'Step B in cycle',
                temperature: '99',
                durationMinutes: '',
                durationSeconds: '45',
              },
            ],
          },
        },
        blockIsActiveHold: true,
        blockTargetTempHold: null,
        lidIsActiveHold: true,
        lidTargetTempHold: '5',
        lidOpenHold: true,
        blockIsActive: false,
      },
      expected: {
        commandCreatorFnName: THERMOCYCLER_PROFILE,
        moduleId: tcModuleId,

        blockTargetTempHold: null,
        lidOpenHold: true,
        lidTargetTempHold: 5,
        profileSteps: [
          // top-level step
          { temperature: 5, holdTime: 50 },
          // cycle rep 1
          { temperature: 12, holdTime: 62 },
          { temperature: 99, holdTime: 45 },
          // cycle rep 2
          { temperature: 12, holdTime: 62 },
          { temperature: 99, holdTime: 45 },
        ],
        profileTargetLidTemp: 40,
        profileVolume: 4,
        meta: {
          rawProfileItems: [
            {
              type: 'profileStep',
              id: 'profileItem1',
              title: 'Top level step',
              temperature: '5',
              durationMinutes: '',
              durationSeconds: '50',
            },
            {
              id: 'profileItem2',
              type: 'profileCycle',
              repetitions: '2',
              steps: [
                {
                  type: 'profileStep',
                  id: 'item2A',
                  title: 'Step A in cycle',
                  temperature: '12',
                  durationMinutes: '1',
                  durationSeconds: '2',
                },
                {
                  type: 'profileStep',
                  id: 'item2B',
                  title: 'Step B in cycle',
                  temperature: '99',
                  durationMinutes: '',
                  durationSeconds: '45',
                },
              ],
            },
          ],
        },
      },
    },
  ]

  testCases.forEach(({ formData, expected, testName }) => {
    it(`should translate "thermocyclerState" to args: ${testName}`, () => {
      expect(thermocyclerFormToArgs(formData)).toEqual(expected)
    })
  })
})
