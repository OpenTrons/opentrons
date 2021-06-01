import * as React from 'react'
import { act } from 'react-dom/test-utils'
import { mount } from 'enzyme'

import { LabeledButton } from '@opentrons/components'
import { AddManualIp } from '..'
import { AddManualIpModal } from '../AddManualIpModal'

jest.mock('../AddManualIpModal', () => ({
  AddManualIpModal: () => <></>,
}))

describe('AddManualIp setting component', () => {
  it('should render a LabeledButton', () => {
    const wrapper = mount(<AddManualIp />)
    const labeledButton = wrapper.find(LabeledButton)

    expect(labeledButton.prop('label')).toBe(
      'Manually Add Robot Network Addresses'
    )
    expect(labeledButton.prop('buttonProps')).toMatchObject({
      children: 'manage',
    })
  })

  it('clicking the button should display an AddManualIpModal', () => {
    const wrapper = mount(<AddManualIp />)
    const button = wrapper.find(LabeledButton)

    expect(wrapper.find(AddManualIpModal)).toHaveLength(0)
    act(() => {
      button.prop('buttonProps').onClick?.({} as React.MouseEvent)
    })
    wrapper.update()

    expect(wrapper.find(AddManualIpModal)).toHaveLength(1)
  })

  it('can close the AddManualIpModal', () => {
    const wrapper = mount(<AddManualIp />)
    const button = wrapper.find(LabeledButton)

    act(() => {
      button.prop('buttonProps').onClick?.({} as React.MouseEvent)
    })
    wrapper.update()

    act(() => {
      wrapper.find(AddManualIpModal).invoke('closeModal')?.()
    })
    wrapper.update()

    expect(wrapper.find(AddManualIpModal)).toHaveLength(0)
  })
})
