import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePipetteConfig } from '../usePipetteConfig'

describe('usePipetteConfig', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePipetteConfig())

    expect(result.current.page).toBe('overview')
    expect(result.current.mount).toBe('left')
    expect(result.current.pipetteType).toBeNull()
    expect(result.current.pipetteGen).toBe('flex')
    expect(result.current.pipetteVolume).toBeNull()
    expect(result.current.selectedTips).toEqual([])
  })

  it('should update page', () => {
    const { result } = renderHook(() => usePipetteConfig())

    act(() => {
      result.current.setPage('add')
    })

    expect(result.current.page).toBe('add')
  })

  it('should update mount', () => {
    const { result } = renderHook(() => usePipetteConfig())

    act(() => {
      result.current.setMount('right')
    })

    expect(result.current.mount).toBe('right')
  })

  it('should update pipetteType', () => {
    const { result } = renderHook(() => usePipetteConfig())

    act(() => {
      result.current.setPipetteType('single')
    })

    expect(result.current.pipetteType).toBe('single')
  })

  it('should update pipetteGen', () => {
    const { result } = renderHook(() => usePipetteConfig())

    act(() => {
      result.current.setPipetteGen('GEN2')
    })

    expect(result.current.pipetteGen).toBe('GEN2')
  })

  it('should update pipetteVolume', () => {
    const { result } = renderHook(() => usePipetteConfig())

    act(() => {
      result.current.setPipetteVolume('1000')
    })

    expect(result.current.pipetteVolume).toBe('1000')
  })

  it('should update selectedTips', () => {
    const { result } = renderHook(() => usePipetteConfig())

    act(() => {
      result.current.setSelectedTips(['tip1', 'tip2'])
    })

    expect(result.current.selectedTips).toEqual(['tip1', 'tip2'])
  })

  it('should reset fields', () => {
    const { result } = renderHook(() => usePipetteConfig())

    act(() => {
      result.current.setPipetteType('single')
      result.current.setPipetteGen('GEN2')
      result.current.setPipetteVolume('1000')
      result.current.setSelectedTips(['tip1', 'tip2'])
      result.current.resetFields()
    })

    expect(result.current.pipetteType).toBeNull()
    expect(result.current.pipetteGen).toBe('flex')
    expect(result.current.pipetteVolume).toBeNull()
    expect(result.current.selectedTips).toEqual([])
  })
})
