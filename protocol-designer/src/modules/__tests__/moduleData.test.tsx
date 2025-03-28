import { describe, it, expect } from 'vitest'
import { getNextAvailableModuleSlot } from '../moduleData'
import type { InitialDeckSetup } from '../../step-forms'

describe('getNextAvailableModuleSlot', () => {
  it('renders slot D2 when it is the magnetic block', () => {
    const mockInitialDeckSetup: InitialDeckSetup = {
      modules: {},
      labware: {},
      pipettes: {},
      additionalEquipmentOnDeck: {},
    }
    const result = getNextAvailableModuleSlot(mockInitialDeckSetup, true)
    expect(result).toBe('D2')
  })
  it('renders slot D1 when no slots are occupied', () => {
    const mockInitialDeckSetup: InitialDeckSetup = {
      modules: {},
      labware: {},
      pipettes: {},
      additionalEquipmentOnDeck: {},
    }
    const result = getNextAvailableModuleSlot(mockInitialDeckSetup, false)
    expect(result).toBe('D1')
  })
  it('renders slot C1 when other slots are occupied', () => {
    const mockInitialDeckSetup: InitialDeckSetup = {
      modules: {},
      labware: {},
      pipettes: {},
      additionalEquipmentOnDeck: {
        wasteChuteId: {
          name: 'wasteChute',
          id: 'wasteChuteId',
          location: 'D3',
        },
        trashBinId: {
          name: 'trashBin',
          id: 'trashBinId',
          location: 'D1',
        },
      },
    }
    const result = getNextAvailableModuleSlot(mockInitialDeckSetup, false)
    expect(result).toBe('C1')
  })
  it('renders undefined when all slots are occupied', () => {
    const mockInitialDeckSetup: InitialDeckSetup = {
      modules: {
        thermocycler: {
          model: 'thermocyclerModuleV2',
          id: 'thermocycler',
          type: 'thermocyclerModuleType',
          slot: 'B1',
          moduleState: {} as any,
          pythonName: 'mockPythonName',
        },
        temperature: {
          model: 'temperatureModuleV2',
          id: 'temperature',
          type: 'temperatureModuleType',
          slot: 'C1',
          moduleState: {} as any,
          pythonName: 'mockPythonName',
        },
      },
      labware: {},
      pipettes: {},
      additionalEquipmentOnDeck: {
        wasteChuteId: {
          name: 'wasteChute',
          id: 'wasteChuteId',
          location: 'D3',
        },
        trashBinId: {
          name: 'trashBin',
          id: 'trashBinId',
          location: 'D1',
        },
        stagingArea1: {
          name: 'stagingArea',
          id: 'stagingArea1',
          location: 'A3',
        },
        stagingArea2: {
          name: 'stagingArea',
          id: 'stagingArea2',
          location: 'B3',
        },
        stagingArea3: {
          name: 'stagingArea',
          id: 'stagingArea3',
          location: 'C3',
        },
      },
    }
    const result = getNextAvailableModuleSlot(mockInitialDeckSetup, false)
    expect(result).toBe(undefined)
  })
})
