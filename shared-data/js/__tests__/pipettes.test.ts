// tests for pipette info accessors in `shared-data/js/pipettes.js`
import { describe, expect, it } from 'vitest'
import { getPipetteNameSpecs, getPipetteModelSpecs } from '../pipettes'

const PIPETTE_NAMES = [
  'p10_single',
  'p50_single',
  'p300_single',
  'p1000_single',
  'p10_multi',
  'p50_multi',
  'p300_multi',
] as const

const PIPETTE_MODELS = [
  'p10_single_v1',
  'p10_single_v1.3',
  'p10_single_v1.4',
  'p10_single_v1.5',
  'p10_multi_v1',
  'p10_multi_v1.3',
  'p10_multi_v1.4',
  'p10_multi_v1.5',
  'p50_single_v1',
  'p50_single_v1.3',
  'p50_single_v1.4',
  'p50_multi_v1',
  'p50_multi_v1.3',
  'p50_multi_v1.4',
  'p50_multi_v1.5',
  'p300_single_v1',
  'p300_single_v1.3',
  'p300_single_v1.4',
  'p300_single_v1.5',
  'p300_multi_v1',
  'p300_multi_v1.3',
  'p300_multi_v1.4',
  'p300_multi_v1.5',
  'p1000_single_v1',
  'p1000_single_v1.3',
  'p1000_single_v1.4',
  'p1000_single_v1.5',
] as const

describe('pipette data accessors', () => {
  describe('getPipetteNameSpecs', () => {
    PIPETTE_NAMES.forEach(name =>
      it(`name ${name} snapshot`, () =>
        expect(getPipetteNameSpecs(name)).toMatchSnapshot())
    )
  })

  describe('getPipetteModelSpecs', () => {
    PIPETTE_MODELS.forEach(model =>
      it(`model ${model} snapshot`, () =>
        expect(getPipetteModelSpecs(model)).toMatchSnapshot())
    )
  })
})
