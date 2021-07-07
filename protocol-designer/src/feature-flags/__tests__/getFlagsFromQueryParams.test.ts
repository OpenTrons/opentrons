// @flow
import { getFlagsFromQueryParams } from '../utils'
describe('getFlagsFromQueryParams', () => {
  it('should enable the flag passed in via query params when it is set to 1', () => {
    // replace window location search
    const actualWindowLocation = window.location
    delete window.location
    window.location = {
      ...actualWindowLocation,
      // include any custom overwrites such as the following sinon stub
      search: '?OT_PD_DISABLE_MODULE_RESTRICTIONS=1',
    }

    expect(getFlagsFromQueryParams()).toEqual({
      OT_PD_DISABLE_MODULE_RESTRICTIONS: true,
    })

    // restore the actual windoe location
    window.location = actualWindowLocation
  })
  it('should disable the flag passed in via query params when it is NOT set to 1', () => {
    // replace window location search
    const actualWindowLocation = window.location
    delete window.location
    window.location = {
      ...actualWindowLocation,
      // include any custom overwrites such as the following sinon stub
      search: '?OT_PD_DISABLE_MODULE_RESTRICTIONS=0',
    }

    expect(getFlagsFromQueryParams()).toEqual({
      OT_PD_DISABLE_MODULE_RESTRICTIONS: false,
    })

    // restore the actual windoe location
    window.location = actualWindowLocation
  })
})
