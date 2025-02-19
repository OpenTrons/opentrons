import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fixture_12_trough,
  fixture_96_plate,
  fixture_trash,
} from '@opentrons/shared-data/labware/fixtures/2'

import { getLabwareLiquidState } from '../selectors'

vi.mock('/protocol-designer/labware-defs/utils')

let labwareEntities: any
let ingredLocs: any

beforeEach(() => {
  labwareEntities = {
    FIXED_TRASH_ID: {
      def: fixture_trash,
    },
    wellPlateId: {
      def: fixture_96_plate,
    },
    troughId: {
      def: fixture_12_trough,
    },
  }

  ingredLocs = {
    wellPlateId: {
      A1: { 0: { volume: 100 } },
      B1: { 0: { volume: 150 } },
    },
    troughId: {
      A1: { 0: { volume: 105 } },
      A2: { 0: { volume: 155 } },
      A3: { 1: { volume: 115 } },
      A6: { 1: { volume: 111 } },
    },
  }
})

function hasAllWellKeys(result: {
  wellPlateId: {}
  troughId: {}
  FIXED_TRASH_ID: {}
}) {
  // make sure each labware has keys for all wells added in
  expect(Object.keys(result.wellPlateId).length).toBe(96)
  expect(Object.keys(result.troughId).length).toBe(12)
  expect(Object.keys(result.FIXED_TRASH_ID).length).toBe(1)
}

describe('getLabwareLiquidState', () => {
  it('no labware + no ingreds', () => {
    // @ts-expect-error(sa, 2021-6-15): resultFunc not part of Selector type
    expect(getLabwareLiquidState.resultFunc({}, {})).toEqual({})
  })

  it('labware + no ingreds: generate empty well keys', () => {
    // @ts-expect-error(sa, 2021-6-15): resultFunc not part of Selector type
    const result = getLabwareLiquidState.resultFunc({}, labwareEntities)

    hasAllWellKeys(result)
  })

  it('selects liquids with multiple ingredient groups & multiple labware: generate all well keys', () => {
    // @ts-expect-error(sa, 2021-6-15): resultFunc not part of Selector type
    const result = getLabwareLiquidState.resultFunc(ingredLocs, labwareEntities)

    expect(result).toMatchObject(ingredLocs)

    hasAllWellKeys(result)
  })
})
