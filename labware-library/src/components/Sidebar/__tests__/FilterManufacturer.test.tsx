// FilterManufacturer component tests
import * as filters from '../../../filters'
import { FilterManufacturerComponent } from '../FilterManufacturer'
import { shallow } from 'enzyme'
import * as React from 'react'

jest.mock('../../../filters')

const getAllManufacturers = filters.getAllManufacturers as jest.MockedFunction<
  typeof filters.getAllManufacturers
>

describe('FilterManufacturer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('component renders', () => {
    getAllManufacturers.mockReturnValue(['all', 'foo', 'bar', 'baz'])

    const filters = { category: 'all', manufacturer: 'all' }
    const tree = shallow(
      <FilterManufacturerComponent
        location={{} as any}
        history={{} as any}
        match={{} as any}
        filters={filters}
      />
    )

    expect(tree).toMatchSnapshot()
  })
})
