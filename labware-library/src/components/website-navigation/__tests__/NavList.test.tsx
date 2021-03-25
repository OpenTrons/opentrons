// tests for main navbar link list
import * as React from 'react'
import { shallow, mount } from 'enzyme'

import { NavList } from '..'

describe('NavList', () => {
  it('component renders', () => {
    const tree = shallow(<NavList />)

    expect(tree).toMatchSnapshot()
  })

  it('component handles state changes', () => {
    const tree = shallow(<NavList />)

    // @ts-expect-error(IL, 2021-03): state is readonly, but also, this is a weird test??
    expect(tree.state().menu).toEqual(null)
    tree.setState({ menu: 'foo' })
    // @ts-expect-error(IL, 2021-03): state is readonly, but also, this is a weird test??
    expect(tree.state().menu).toEqual('foo')
  })

  it('component applies active class to nav links based on state', () => {
    const wrapper = mount(<NavList />)

    // when state.menu is null, all nav links are active
    expect(wrapper.find('.nav_link').every('.active')).toBe(true)
    wrapper.setState({ menu: 'About' })
    // setting menu to a valid value activates just the one link
    expect(wrapper.find('.active.nav_link')).toHaveLength(1)
  })
})
