import { describe, it, expect } from 'vitest'
import { fixture_96_plate } from '@opentrons/shared-data/labware/fixtures/2'
import { getLabwareIsCustom } from '../labwareModuleCompatibility'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
describe('labwareModuleCompatibility', () => {
  describe('getLabwareIsCustom', () => {
    const labwareOnDeck = {
      labwareDefURI: 'fixture/fixture_96_plate',
      id: 'abcef123',
      slot: '3',
      def: fixture_96_plate as LabwareDefinition2,
      pythonName: 'mockPythonName',
    }
    it('returns true when labware is inside custom labwares obj', () => {
      const customLabwares = {
        'fixture/fixture_96_plate': fixture_96_plate as LabwareDefinition2,
      }
      const labwareIsCustom = getLabwareIsCustom(customLabwares, labwareOnDeck)
      expect(labwareIsCustom).toEqual(true)
    })
    it('returns false when labware is not inside custom labwares obj', () => {
      const labwareIsCustom = getLabwareIsCustom({}, labwareOnDeck)
      expect(labwareIsCustom).toEqual(false)
    })
  })
})
