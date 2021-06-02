import React from 'react'
import { shallow } from 'enzyme'

import { Page } from '../../../atoms/Page'
import { NetworkSettingsCard } from '../NetworkSettingsCard'
import { SystemInfoCard } from '../SystemInfoCard'
import { NetworkAndSystem } from '../NetworkAndSystem'

describe('/more/network-and-system page component', () => {
  it('should render a Page with the correct title', () => {
    const wrapper = shallow(<NetworkAndSystem />)
    expect(wrapper.find(Page).prop('titleBarProps')).toEqual({
      title: 'Network & System',
    })
  })

  it('renders a NetworkSettingsCard', () => {
    const wrapper = shallow(<NetworkAndSystem />)
    expect(wrapper.find(NetworkSettingsCard)).toHaveLength(1)
  })

  it('renders a SystemInfoCard', () => {
    const wrapper = shallow(<NetworkAndSystem />)
    expect(wrapper.find(SystemInfoCard)).toHaveLength(1)
  })
})
