import { describe, it, expect } from 'vitest'
import { THERMOCYCLER_MODULE_TYPE } from '@opentrons/shared-data'
import { shouldShowCoolingHint as _shouldShowCoolingHint } from '../selectors'
import type { ThermocyclerModuleState } from '/protocol-designer/step-forms/types'
// TODO(IL, 2020-05-19): Flow doesn't have type for resultFunc
const shouldShowCoolingHint: any = _shouldShowCoolingHint
const tcModuleId = 'tcModuleId'
describe('shouldShowCoolingHint', () => {
  const testCases = [
    {
      testName: 'should show the hint when lid temperature is decreasing',
      prevLidTemp: 75,
      nextLidTemp: 40,
      formStepType: 'thermocycler',
      expected: true,
    },
    {
      testName: 'should not show the hint for non-thermocycler forms',
      prevLidTemp: 75,
      nextLidTemp: undefined,
      formStepType: 'moveLiquid',
      expected: false,
    },
    {
      testName:
        'should not show the hint when previous lid temperature is null',
      prevLidTemp: null,
      nextLidTemp: 40,
      formStepType: 'thermocycler',
      expected: false,
    },
    {
      testName: 'should not show the hint when next lid temperature is null',
      prevLidTemp: 75,
      nextLidTemp: null,
      formStepType: 'thermocycler',
      expected: false,
    },
    {
      testName: 'should not show the hint when lid temperature is increasing',
      prevLidTemp: 75,
      nextLidTemp: 80,
      formStepType: 'thermocycler',
      expected: false,
    },
  ]
  testCases.forEach(
    ({ testName, prevLidTemp, nextLidTemp, formStepType, expected }) => {
      it(testName, () => {
        const moduleState: ThermocyclerModuleState = {
          type: THERMOCYCLER_MODULE_TYPE,
          lidTargetTemp: prevLidTemp,
          lidOpen: false,
          blockTargetTemp: null,
        }
        const prevTimelineFrame = {
          robotState: {
            modules: {
              [tcModuleId]: {
                moduleState,
              },
            },
          },
        }
        const unsavedForm = {
          stepType: 'thermocycler',
          moduleId: tcModuleId,
          lidTargetTemp: nextLidTemp,
        }
        const result = shouldShowCoolingHint.resultFunc(
          prevTimelineFrame,
          unsavedForm
        )
        expect(result).toBe(expected)
      })
    }
  )
})
