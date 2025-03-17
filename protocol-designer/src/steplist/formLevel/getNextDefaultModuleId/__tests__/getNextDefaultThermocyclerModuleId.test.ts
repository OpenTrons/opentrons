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
import { getNextDefaultThermocyclerModuleId } from '../getNextDefaultThermocyclerModuleId'
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

describe('getNextDefaultThermocyclerModuleId', () => {
  describe('NO previous forms', () => {
    const testCases: Array<{
      testMsg: string
      equippedModulesById: Record<string, ModuleOnDeck>
      expected: string | null
    }> = [
      {
        testMsg: 'temp and TC module present: use TC',
        equippedModulesById: {
          tempId: getTemp(),
          tcId: getThermocycler(),
        },
        expected: 'tcId',
      },
      {
        testMsg: 'only TC module present: use TC',
        equippedModulesById: {
          tcId: getThermocycler(),
        },
        expected: 'tcId',
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
        const result = getNextDefaultThermocyclerModuleId(equippedModulesById)
        expect(result).toBe(expected)
      })
    })
  })
  describe('previous forms', () => {
    const testCases: Array<{
      testMsg: string
      equippedModulesById: Record<string, ModuleOnDeck>
      expected: string | null
    }> = [
      {
        testMsg: 'temp and tc present, last step was tc: use tc mod',
        equippedModulesById: {
          tempId: getTemp(),
          tcId: getThermocycler(),
        },
        expected: 'tcId',
      },
      {
        testMsg: 'temp and mag present return null',
        equippedModulesById: {
          magId: {
            id: 'magId',
            type: MAGNETIC_MODULE_TYPE,
            model: MAGNETIC_MODULE_V1,
            slot: '_span781011',
            moduleState: {
              type: MAGNETIC_MODULE_TYPE,
              engaged: false,
            },
            pythonName: 'mockPythonName',
          },
          tempId: {
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
          },
        },
        expected: null,
      },
    ]
    testCases.forEach(({ testMsg, equippedModulesById, expected }) => {
      it(testMsg, () => {
        const result = getNextDefaultThermocyclerModuleId(equippedModulesById)
        expect(result).toBe(expected)
      })
    })
  })
})
