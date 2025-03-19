import { describe, expect, vi, it } from 'vitest'

import { getSortedLiquidClassDefs } from '..'
import { getAllLiquidClassDefs } from '../../liquidClasses'

vi.mock('../../liquidClasses')

describe('getSortedLiquidClassDefs', () => {
  it('should have sorted the defs in alphabetical order based on displayName', () => {
    vi.mocked(getAllLiquidClassDefs).mockReturnValue({
      ethanol: {
        liquidClassName: '',
        displayName: 'C',
        description: '',
        schemaVersion: 0,
        namespace: '',
        byPipette: [],
      },
      glyeral: {
        liquidClassName: '',
        displayName: 'B',
        description: '',
        schemaVersion: 0,
        namespace: '',
        byPipette: [],
      },
      water: {
        displayName: 'A',
        liquidClassName: '',
        description: '',
        schemaVersion: 0,
        namespace: '',
        byPipette: [],
      },
    })
    const result = getSortedLiquidClassDefs()

    const expectedOrder = ['water', 'glyeral', 'ethanol']
    expect(Object.keys(result)).toEqual(expectedOrder)
  })
})
