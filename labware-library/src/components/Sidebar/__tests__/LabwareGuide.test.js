// @flow
// LabwareGuide component tests
import * as React from 'react'
import { shallow } from 'enzyme'

import { LabwareGuide } from '../LabwareGuide'

describe('LabwareGuide', () => {
  it('component renders', () => {
    const tree = shallow(<LabwareGuide />)

    expect(tree).toMatchSnapshot()
  })
})
