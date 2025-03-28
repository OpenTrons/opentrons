import { it, describe, expect } from 'vitest'
import {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  TEMPERATURE_MODULE_V1,
  THERMOCYCLER_MODULE_V1,
} from '@opentrons/shared-data'
import { TEMPERATURE_DEACTIVATED } from '@opentrons/step-generation'
import { getNextDefaultTemperatureModuleId } from '../getNextDefaultTemperatureModuleId'
import type { FormData, StepIdType } from '../../../../form-types'
import type { ModuleOnDeck } from '../../../../step-forms'

const getThermocycler = () => ({
  id: 'tcId',
  type: THERMOCYCLER_MODULE_TYPE,
  model: THERMOCYCLER_MODULE_V1,
  slot: '_span781011',
  moduleState: {
    type: THERMOCYCLER_MODULE_TYPE,
    blockTargetTemp: null,
    lidTargetTemp: null,
    lidOpen: null,
  },
  pythonName: 'mockPythonName',
})

const getMag = () => ({
  id: 'magId',
  type: MAGNETIC_MODULE_TYPE,
  model: MAGNETIC_MODULE_V1,
  slot: '_span781011',
  moduleState: {
    type: MAGNETIC_MODULE_TYPE,
    engaged: false,
  },
  pythonName: 'mockPythonName',
})

const getTemp = () => ({
  id: 'tempId',
  type: TEMPERATURE_MODULE_TYPE,
  model: TEMPERATURE_MODULE_V1,
  slot: '3',
  moduleState: {
    type: TEMPERATURE_MODULE_TYPE,
    status: TEMPERATURE_DEACTIVATED,
    targetTemperature: null,
  },
  pythonName: 'mockPythonName',
})

describe('getNextDefaultTemperatureModuleId', () => {
  describe('NO previous forms', () => {
    const testCases: Array<{
      testMsg: string
      equippedModulesById: Record<string, ModuleOnDeck>
      expected: string | null
    }> = [
      {
        testMsg: 'temp and TC module present: use temp',
        equippedModulesById: {
          tempId: getTemp(),
          tcId: getThermocycler(),
        },
        expected: 'tempId',
      },
      {
        testMsg: 'only mag module present: return null',
        equippedModulesById: {
          magId: getMag(),
        },
        expected: null,
      },
    ]
    testCases.forEach(({ testMsg, equippedModulesById, expected }) => {
      it(testMsg, () => {
        const savedForms = {}
        const orderedStepIds: string[] = []
        const result = getNextDefaultTemperatureModuleId(
          savedForms,
          orderedStepIds,
          equippedModulesById
        )
        expect(result).toBe(expected)
      })
    })
  })
  describe('previous forms', () => {
    const testCases: Array<{
      testMsg: string
      equippedModulesById: Record<string, ModuleOnDeck>
      savedForms: Record<StepIdType, FormData>
      orderedStepIds: string[]
      expected: string
    }> = [
      {
        testMsg: 'temp and tc present, last step was tc: use temp mod',
        equippedModulesById: {
          tempId: getTemp(),
          tcId: getThermocycler(),
        },
        savedForms: {
          tempStepId: {
            id: 'tempStepId',
            stepType: 'temperature',
            stepName: 'temperature',
            moduleId: 'tempId',
          },
          tcStepId: {
            id: 'tcStepId',
            stepType: 'thermocycler',
            stepName: THERMOCYCLER_MODULE_TYPE,
            moduleId: 'tcId',
          },
        },
        orderedStepIds: ['tempStepId', 'tcStepId'],
        expected: 'tempId',
      },
      {
        testMsg: 'temp and mag present, last step was mag step: use temp mod',
        equippedModulesById: {
          magId: getMag(),
          tempId: getTemp(),
        },
        savedForms: {
          tempStepId: {
            id: 'tempStepId',
            stepType: 'temperature',
            stepName: 'temperature',
            moduleId: 'tempId',
          },
          magStepId: {
            id: 'magStepId',
            stepType: 'magnet',
            stepName: 'magnet',
            moduleId: 'magdeckId',
          },
        },
        orderedStepIds: ['tempStepId', 'magStepId'],
        expected: 'tempId',
      },
    ]
    testCases.forEach(
      ({
        testMsg,
        savedForms = {},
        equippedModulesById,
        orderedStepIds = [],
        expected,
      }) => {
        it(testMsg, () => {
          const result = getNextDefaultTemperatureModuleId(
            savedForms,
            orderedStepIds,
            equippedModulesById
          )
          expect(result).toBe(expected)
        })
      }
    )
  })
})
