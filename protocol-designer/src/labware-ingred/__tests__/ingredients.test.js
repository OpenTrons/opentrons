import { ingredients, ingredLocations } from '../reducers'

// TODO: BC 2018-7-24 test SWAP_SLOT_CONTENTS && DUPLICATE_LABWARE instead
describe.skip('COPY_LABWARE action', () => {
  test('copy ingredient locations from cloned container', () => {
    const copyLabwareAction = {
      type: 'COPY_LABWARE',
      payload: {
        fromContainer: 'myTrough',
        toContainer: 'newContainer',
        toSlot: '5',
      },
    }

    const prevIngredState = {
      ingred3: {
        name: 'Buffer',
        wellDetailsByLocation: null,
        concentration: '50 mol/ng',
        description: '',
        serialize: false,
      },
      ingred4: {
        name: 'Other Ingred',
        wellDetailsByLocation: null,
        concentration: '100%',
        description: '',
        serialize: false,
      },
    }

    const prevLocationsState = {
      myTrough: {
        A1: { ingred3: { volume: 101 } },
        A2: { ingred3: { volume: 102 } },
        A3: { ingred3: { volume: 103 } },
      },
      otherContainer: {
        D4: { ingred3: { volume: 201 } },
        E4: { ingred3: { volume: 202 } },
        A4: { ingred4: { volume: 301 } },
        B4: { ingred4: { volume: 302 } },
      },
    }

    expect(ingredients(prevIngredState, copyLabwareAction)).toEqual(
      prevIngredState
    )

    expect(ingredLocations(prevLocationsState, copyLabwareAction)).toEqual({
      myTrough: {
        A1: { ingred3: { volume: 101 } },
        A2: { ingred3: { volume: 102 } },
        A3: { ingred3: { volume: 103 } },
      },
      // this is newly copied
      newContainer: {
        A1: { ingred3: { volume: 101 } },
        A2: { ingred3: { volume: 102 } },
        A3: { ingred3: { volume: 103 } },
      },
      otherContainer: {
        D4: { ingred3: { volume: 201 } },
        E4: { ingred3: { volume: 202 } },
        A4: { ingred4: { volume: 301 } },
        B4: { ingred4: { volume: 302 } },
      },
    })
  })
})
