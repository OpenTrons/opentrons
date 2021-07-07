// @flow
import fixture_tiprack_10_ul from '@opentrons/shared-data/labware/fixtures/2/fixture_tiprack_10_ul.json'
import { volumeTooHigh } from '../errors'

describe('volumeTooHigh', () => {
  let fieldsWithPipette
  beforeEach(() => {
    fieldsWithPipette = {
      pipette: {
        spec: {
          maxVolume: 10,
        },
        tiprackLabwareDef: { ...fixture_tiprack_10_ul }, // max tip volume is 10 ul
      },
    }
  })
  it('should NOT return an error when the volume equals the max pipette/tip volume', () => {
    const fields = {
      ...fieldsWithPipette,
      volume: 10,
    }
    expect(volumeTooHigh(fields)).toBe(null)
  })
  it('should NOT return an error when the volume is less than the max pipette volume', () => {
    const fields = {
      ...fieldsWithPipette,
      volume: 9,
    }
    expect(volumeTooHigh(fields)).toBe(null)
  })
  it('should return an error when the volume is greater than the max pipette volume', () => {
    const fields = {
      ...fieldsWithPipette,
      volume: 11,
    }
    expect(volumeTooHigh(fields).title).toBe(
      `Volume is greater than maximum pipette/tip volume (${fields.pipette.spec.maxVolume} ul)`
    )
    expect(volumeTooHigh(fields).dependentFields).toEqual(['pipette', 'volume'])
  })
})
