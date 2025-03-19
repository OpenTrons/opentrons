import { describe, expect, vi, it } from 'vitest'

import {
  getDisableLiquidClasses,
  getIncompatibleLiquidClasses,
  getSortedLiquidClassDefs,
} from '..'
import { getAllLiquidClassDefs } from '../../liquidClasses'
import type { LiquidClassesOption } from '../..'

vi.mock('../../liquidClasses')

const expectedLiquidClasses: LiquidClassesOption[] = [
  'Volatile',
  'Viscous',
  'Aqueous',
]

const mockLiquidClassesDefs = {
  ethanol: {
    liquidClassName: '',
    displayName: 'Volatile' as LiquidClassesOption,
    description: '',
    schemaVersion: 0,
    namespace: '',
    byPipette: [
      {
        pipetteModel: 'mockPipetteModel1',
        byTipType: [
          {
            tiprack: 'mockTiprack1',
            aspirate: [] as any,
            singleDispense: [] as any,
            multiDispense: [] as any,
          },
        ],
      },
      { pipetteModel: 'mockPipetteModel2', byTipType: [] },
    ],
  },
  glyeral: {
    liquidClassName: '',
    displayName: 'Viscous' as LiquidClassesOption,
    description: '',
    schemaVersion: 0,
    namespace: '',
    byPipette: [
      {
        pipetteModel: 'mockPipetteModel1',
        byTipType: [
          {
            tiprack: 'mockTiprack1',
            aspirate: [] as any,
            singleDispense: [] as any,
            multiDispense: [] as any,
          },
        ],
      },
    ],
  },
  water: {
    displayName: 'Aqueous' as LiquidClassesOption,
    liquidClassName: '',
    description: '',
    schemaVersion: 0,
    namespace: '',
    byPipette: [
      {
        pipetteModel: 'mockPipetteModel1',
        byTipType: [
          {
            tiprack: 'mockTiprack1',
            aspirate: [] as any,
            singleDispense: [] as any,
          },
        ],
      },
    ],
  },
}

describe('getSortedLiquidClassDefs', () => {
  it('should have sorted the defs in alphabetical order based on displayName', () => {
    vi.mocked(getAllLiquidClassDefs).mockReturnValue(mockLiquidClassesDefs)
    const result = getSortedLiquidClassDefs()

    const expectedOrder = ['water', 'glyeral', 'ethanol']
    expect(Object.keys(result)).toEqual(expectedOrder)
  })
})

describe('getIncompatibleLiquidClasses', () => {
  it('should returns a list of liquid class displayNames that are incompatible with the pipette', () => {
    vi.mocked(getAllLiquidClassDefs).mockReturnValue(mockLiquidClassesDefs)
    const incompatibleAllLiquidClasses = getIncompatibleLiquidClasses(
      'notMockPipetteModel'
    )
    expect(incompatibleAllLiquidClasses).toEqual(expectedLiquidClasses)

    const incompatibleSomeLiquidClasses = getIncompatibleLiquidClasses(
      'mockPipetteModel2'
    )
    expect(incompatibleSomeLiquidClasses).toEqual(['Viscous', 'Aqueous'])
  })
  it('should NOT returns liquid classes name if the pipette is compatible with all liquid class', () => {
    vi.mocked(getAllLiquidClassDefs).mockReturnValue(mockLiquidClassesDefs)
    const noIncompatibleLiquidClasses = getIncompatibleLiquidClasses(
      'mockPipetteModel1'
    )
    expect(noIncompatibleLiquidClasses).toEqual([])
  })

  it('should returns a list of liquid class displayNames that are incompatible with the path multiDispense', () => {
    vi.mocked(getAllLiquidClassDefs).mockReturnValue(mockLiquidClassesDefs)
    const incompatibleLiquidClasses = getIncompatibleLiquidClasses(
      'mockPipetteModel1',
      p =>
        p.byTipType.some(
          (t: { tiprack: string; multiDispense?: any }) =>
            t.tiprack === 'mockTiprack1' && t.multiDispense !== undefined
        )
    )
    expect(incompatibleLiquidClasses).toEqual(['Aqueous'])
  })
})

describe('getDisableLiquidClasses', () => {
  it('should returns a list of liquid class names that should be diasbled given incompatible volume', () => {
    const valuesForLiquidClasses = { volume: 10, pipette: 'mockId' }
    const disabledLiquidClasses = getDisableLiquidClasses(
      valuesForLiquidClasses,
      'mockPipetteModel1'
    )
    const containsAny = expectedLiquidClasses.some(cls =>
      disabledLiquidClasses?.has(cls)
    )
    expect(containsAny).toEqual(true)
  })
})
