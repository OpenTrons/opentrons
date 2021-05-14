import * as React from 'react'
import { act } from 'react-dom/test-utils'
import { mount } from 'enzyme'

import { ConfirmResetPathModal } from '../ConfirmResetPathModal'
import {
  ManagePath,
  OPEN_SOURCE_NAME,
  CHANGE_SOURCE_NAME,
  RESET_SOURCE_NAME,
} from '../ManagePath'

import type { ReactWrapper } from 'enzyme'

describe('ManagePath', () => {
  const mockPath = '/path/to/a/place'
  const mockOnChangePath = jest.fn()
  const mockOnOpenPath = jest.fn()
  const mockOnResetPath = jest.fn()
  let wrapper: ReactWrapper<React.ComponentProps<typeof ManagePath>>

  beforeEach(() => {
    wrapper = mount(
      <ManagePath
        path={mockPath}
        onOpenPath={mockOnOpenPath}
        onResetPath={mockOnResetPath}
        onChangePath={mockOnChangePath}
      />
    )
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('component displays path', () => {
    expect(wrapper.html()).toContain(mockPath)
  })

  it('has a OutlineButton that calls onOpenPath on click', () => {
    expect(mockOnOpenPath).toHaveBeenCalledTimes(0)
    wrapper
      .find(`OutlineButton[name="${OPEN_SOURCE_NAME}"]`)
      .invoke('onClick')?.({} as React.MouseEvent)
    expect(mockOnOpenPath).toHaveBeenCalledTimes(1)
  })

  it('has an IconCta that calls onChangePath on click', () => {
    expect(mockOnChangePath).toHaveBeenCalledTimes(0)
    wrapper.find(`IconCta[name="${CHANGE_SOURCE_NAME}"]`).invoke('onClick')?.(
      {} as React.MouseEvent
    )
    expect(mockOnChangePath).toHaveBeenCalledTimes(1)
  })

  describe('reset source', () => {
    beforeEach(() => {
      expect(wrapper.exists(ConfirmResetPathModal)).toBe(false)

      act(() => {
        wrapper
          .find(`IconCta[name="${RESET_SOURCE_NAME}"]`)
          .invoke('onClick')?.({} as React.MouseEvent)
      })

      wrapper.update()
    })

    it('has an IconCta that opens a ConfirmResetPathModal', () => {
      expect(wrapper.exists(ConfirmResetPathModal)).toBe(true)
    })

    it('ConfirmResetPathModal::onCancel closes modal without resetting path', () => {
      act(() => {
        wrapper.find(ConfirmResetPathModal).invoke('onCancel')?.()
      })

      wrapper.update()
      expect(mockOnResetPath).toHaveBeenCalledTimes(0)
      expect(wrapper.exists(ConfirmResetPathModal)).toBe(false)
    })

    it('ConfirmResetPathModal::onConfirm calls onResetPath and closes modal', () => {
      expect(mockOnResetPath).toHaveBeenCalledTimes(0)
      act(() => {
        wrapper.find(ConfirmResetPathModal).invoke('onConfirm')?.()
      })

      wrapper.update()
      expect(mockOnResetPath).toHaveBeenCalledTimes(1)
      expect(wrapper.exists(ConfirmResetPathModal)).toBe(false)
    })
  })
})
