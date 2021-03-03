import * as React from 'react'
import { act } from 'react-dom/test-utils'
import { mount } from 'enzyme'

import { useToggle } from '../useToggle'

describe('useToggle hook', () => {
  let result: ReturnType<typeof useToggle>

  const TestUseToggle = (props: {
    initialValue: boolean | undefined
  }): JSX.Element => {
    result = useToggle(props.initialValue)
    return <></>
  }
  const render = (initialValue?: boolean): ReturnType<typeof mount> => {
    return mount(<TestUseToggle initialValue={initialValue} />)
  }

  it('should use initialValue=false', () => {
    render(false)
    expect(result[0]).toBe(false)
  })

  it('should use initialValue=true', () => {
    render(true)
    expect(result[0]).toBe(true)
  })

  it('should default initialValue to false', () => {
    render()
    expect(result[0]).toBe(false)
  })

  it('should toggle', () => {
    render(false)
    act(() => result[1]())
    expect(result[0]).toBe(true)
    act(() => result[1]())
    expect(result[0]).toBe(false)
  })
})
