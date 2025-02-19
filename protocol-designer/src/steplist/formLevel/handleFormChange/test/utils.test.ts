import { describe, it, beforeEach, expect } from 'vitest'
import { fixtureP300SingleV2Specs } from '@opentrons/shared-data'
import {
  volumeInCapacityForMulti,
  volumeInCapacityForMultiAspirate,
  volumeInCapacityForMultiDispense,
} from '../utils'
import { fixture_tiprack_300_ul } from '@opentrons/shared-data/labware/fixtures/2'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { PipetteEntities } from '@opentrons/step-generation'
import type { FormData } from '/protocol-designer/form-types'

const fixtureTiprack300ul = fixture_tiprack_300_ul as LabwareDefinition2

describe('utils', () => {
  describe('volumeInCapacityForMulti', () => {
    let sharedForm: FormData
    let pipetteEntities: PipetteEntities
    beforeEach(() => {
      sharedForm = {
        pipette: 'p300_single',
      } as any
      pipetteEntities = {
        p300_single: {
          spec: fixtureP300SingleV2Specs,
          tiprackLabwareDef: [fixtureTiprack300ul],
        },
      } as any
    })
    describe('multi dispense path', () => {
      const testCases = [
        {
          msg: '2x volume + air gap vol <= max capacity',
          form: {
            path: 'multiDispense',
            volume: '100',
            aspirate_airGap_checkbox: true,
            aspirate_airGap_volume: '100',
          },
          expected: true,
        },
        {
          msg:
            '2x volume + air gap vol >= max capacity, air gap checkbox NOT checked',
          form: {
            path: 'multiDispense',
            volume: '150',
            aspirate_airGap_checkbox: false,
            aspirate_airGap_volume: '100',
          },
          expected: true,
        },
        {
          msg: '2x volume + air gap vol >= max capacity',
          form: {
            path: 'multiDispense',
            volume: '150',
            aspirate_airGap_checkbox: true,
            aspirate_airGap_volume: '100',
          },
          expected: false,
        },
        {
          msg: 'volume too large, no air gap',
          form: {
            path: 'multiDispense',
            volume: '200',
            aspirate_airGap_checkbox: false,
            aspirate_airGap_volume: '0',
          },
          expected: false,
        },
        {
          msg: 'air gap too large',
          form: {
            path: 'multiDispense',
            volume: '100',
            aspirate_airGap_checkbox: true,
            aspirate_airGap_volume: '101',
          },
          expected: false,
        },
      ]
      describe('ensure that 2x volume + air gap volume can fit in pipette', () => {
        testCases.forEach(({ msg, form, expected }) => {
          it(msg, () => {
            expect(
              volumeInCapacityForMulti(
                { ...sharedForm, ...form },
                pipetteEntities
              )
            ).toBe(expected)
          })
        })
      })
    })
    describe('multi aspirate path', () => {
      const testCases = [
        {
          msg: '2x volume + 2x air gap vol >= max capacity',
          form: {
            path: 'multiAspirate',
            volume: '100',
            aspirate_airGap_checkbox: true,
            aspirate_airGap_volume: '100',
          },
          expected: false,
        },
        {
          msg:
            '2x volume + 2x air gap vol >= max capacity, air gap checkbox NOT checked',
          form: {
            path: 'multiAspirate',
            volume: '150',
            aspirate_airGap_checkbox: false,
            aspirate_airGap_volume: '100',
          },
          expected: true,
        },
        {
          msg: 'volume too large, no air gap',
          form: {
            path: 'multiAspirate',
            volume: '200',
            aspirate_airGap_checkbox: false,
            aspirate_airGap_volume: '0',
          },
          expected: false,
        },
        {
          msg: 'air gap too large',
          form: {
            path: 'multiAspirate',
            volume: '100',
            aspirate_airGap_checkbox: true,
            aspirate_airGap_volume: '51',
          },
          expected: false,
        },
      ]
      describe('ensure that 2x volume + 2x air gap volume can fit in pipette', () => {
        testCases.forEach(({ msg, form, expected }) => {
          it(msg, () => {
            expect(
              volumeInCapacityForMulti(
                { ...sharedForm, ...form },
                pipetteEntities
              )
            ).toBe(expected)
          })
        })
      })
    })
  })
  describe('volumeInCapacityForMultiDispense', () => {
    it('should return false when air gap is too large', () => {
      const volume = 5
      const pipetteCapacity = 300
      const airGapVolume = 291
      expect(
        volumeInCapacityForMultiDispense({
          volume,
          pipetteCapacity,
          airGapVolume,
        })
      ).toBe(false)
    })
    it('should return false when volume is too large', () => {
      const volume = 149
      const pipetteCapacity = 300
      const airGapVolume = 3
      expect(
        volumeInCapacityForMultiDispense({
          volume,
          pipetteCapacity,
          airGapVolume,
        })
      ).toBe(false)
    })
    it('should return true when air gap is small', () => {
      const volume = 142
      const pipetteCapacity = 300
      const airGapVolume = 16
      expect(
        volumeInCapacityForMultiDispense({
          volume,
          pipetteCapacity,
          airGapVolume,
        })
      ).toBe(true)
    })
    it('should return true when volume is small', () => {
      const volume = 1
      const pipetteCapacity = 300
      const airGapVolume = 298
      expect(
        volumeInCapacityForMultiDispense({
          volume,
          pipetteCapacity,
          airGapVolume,
        })
      ).toBe(true)
    })
  })
  describe('volumeInCapacityForMultiAspirate', () => {
    it('should return false when air gap is too large', () => {
      const volume = 5
      const pipetteCapacity = 300
      const airGapVolume = 146
      expect(
        volumeInCapacityForMultiAspirate({
          volume,
          pipetteCapacity,
          airGapVolume,
        })
      ).toBe(false)
    })
    it('should return false when volume is too large', () => {
      const volume = 149
      const pipetteCapacity = 300
      const airGapVolume = 2
      expect(
        volumeInCapacityForMultiAspirate({
          volume,
          pipetteCapacity,
          airGapVolume,
        })
      ).toBe(false)
    })
    it('should return true when air gap is small', () => {
      const volume = 142
      const pipetteCapacity = 300
      const airGapVolume = 8
      expect(
        volumeInCapacityForMultiAspirate({
          volume,
          pipetteCapacity,
          airGapVolume,
        })
      ).toBe(true)
    })
    it('should return true when volume is small', () => {
      const volume = 1
      const pipetteCapacity = 300
      const airGapVolume = 149
      expect(
        volumeInCapacityForMultiAspirate({
          volume,
          pipetteCapacity,
          airGapVolume,
        })
      ).toBe(true)
    })
  })
})
