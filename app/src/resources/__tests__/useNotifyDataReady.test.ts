import { useDispatch } from 'react-redux'
import { renderHook } from '@testing-library/react'
import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'

import { useHost } from '@opentrons/react-api-client'

import { useNotifyDataReady } from '../useNotifyDataReady'
import { appShellListener } from '/app/redux/shell/remote'
import { useTrackEvent } from '/app/redux/analytics'
import { notifySubscribeAction } from '/app/redux/shell'
import { useFeatureFlag } from '/app/redux/config'

import type { Mock } from 'vitest'
import type { HostConfig } from '@opentrons/api-client'
import type { QueryOptionsWithPolling } from '../useNotifyDataReady'

vi.unmock('../useNotifyDataReady')
vi.mock('react-redux')
vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux/analytics')
vi.mock('/app/redux/config')
vi.mock('/app/redux/shell/remote', () => ({
  appShellListener: vi.fn(),
}))

const MOCK_HOST_CONFIG: HostConfig = { hostname: 'MOCK_HOST' }
const MOCK_TOPIC = '/test/topic' as any
const MOCK_OPTIONS: QueryOptionsWithPolling<any, any> = {
  forceHttpPolling: false,
}

describe('useNotifyDataReady', () => {
  let mockDispatch: Mock
  let mockTrackEvent: Mock

  beforeEach(() => {
    mockDispatch = vi.fn()
    mockTrackEvent = vi.fn()
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent)
    vi.mocked(useDispatch).mockReturnValue(mockDispatch)
    vi.mocked(useHost).mockReturnValue(MOCK_HOST_CONFIG)
    vi.mocked(appShellListener).mockClear()
    when(vi.mocked(useFeatureFlag))
      .calledWith('forceHttpPolling')
      .thenReturn(false)
  })

  afterEach(() => {
    vi.mocked(useDispatch).mockClear()
    vi.clearAllMocks()
  })

  it('should return queryOptionsNotify and shouldRefetch on a successful initial mount', () => {
    const { result } = renderHook(() =>
      useNotifyDataReady({
        topic: MOCK_TOPIC,
        options: MOCK_OPTIONS,
      } as any)
    )
    expect(result.current.shouldRefetch).toEqual(true)
    expect(result.current.queryOptionsNotify).toBeDefined()
    expect(mockDispatch).toHaveBeenCalledWith(
      notifySubscribeAction(MOCK_HOST_CONFIG.hostname, MOCK_TOPIC)
    )
    expect(appShellListener).toHaveBeenCalled()
  })

  it('should not subscribe to notifications if forceHttpPolling is true', () => {
    const { result } = renderHook(() =>
      useNotifyDataReady({
        topic: MOCK_TOPIC,
        options: { ...MOCK_OPTIONS, forceHttpPolling: true },
      } as any)
    )
    expect(result.current.shouldRefetch).toEqual(false)
    expect(appShellListener).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('should not subscribe to notifications if enabled is false', () => {
    const { result } = renderHook(() =>
      useNotifyDataReady({
        topic: MOCK_TOPIC,
        options: { ...MOCK_OPTIONS, enabled: false },
      } as any)
    )
    expect(result.current.shouldRefetch).toEqual(false)
    expect(appShellListener).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('should not subscribe to notifications if staleTime is Infinity', () => {
    const { result } = renderHook(() =>
      useNotifyDataReady({
        topic: MOCK_TOPIC,
        options: { ...MOCK_OPTIONS, staleTime: Infinity },
      } as any)
    )
    expect(result.current.shouldRefetch).toEqual(false)
    expect(appShellListener).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('should set shouldRefetch to false if there is an error', () => {
    vi.mocked(useHost).mockReturnValue({ hostname: null } as any)
    const errorSpy = vi.spyOn(console, 'error')
    errorSpy.mockImplementation(() => {})

    const { result } = renderHook(() =>
      useNotifyDataReady({
        topic: MOCK_TOPIC,
        options: MOCK_OPTIONS,
      } as any)
    )

    expect(result.current.shouldRefetch).toEqual(false)
  })

  it('should set shouldRefetch to false and fire an analytics reporting event if the connection was refused', () => {
    vi.mocked(appShellListener).mockImplementation(function ({
      callback,
    }): any {
      // eslint-disable-next-line n/no-callback-literal
      callback('ECONNREFUSED')
    })
    const { rerender, result } = renderHook(() =>
      useNotifyDataReady({
        topic: MOCK_TOPIC,
        options: MOCK_OPTIONS,
      } as any)
    )
    expect(mockTrackEvent).toHaveBeenCalled()
    rerender()
    expect(result.current.shouldRefetch).toEqual(false)
  })

  it('should set shouldRefetch to true if the refetch flag was returned', () => {
    vi.mocked(appShellListener).mockImplementation(function ({
      callback,
    }): any {
      // eslint-disable-next-line n/no-callback-literal
      callback({ refetch: true })
    })
    const { rerender, result } = renderHook(() =>
      useNotifyDataReady({
        topic: MOCK_TOPIC,
        options: MOCK_OPTIONS,
      } as any)
    )
    rerender()
    expect(result.current.shouldRefetch).toEqual(true)
  })

  it('should set shouldRefetch to true if the unsubscribe flag was returned', () => {
    vi.mocked(appShellListener).mockImplementation(function ({
      callback,
    }): any {
      // eslint-disable-next-line n/no-callback-literal
      callback({ unsubscribe: true })
    })
    const { rerender, result } = renderHook(() =>
      useNotifyDataReady({
        topic: MOCK_TOPIC,
        options: MOCK_OPTIONS,
      } as any)
    )
    rerender()
    expect(result.current.shouldRefetch).toEqual(true)
  })

  it('should clean up the listener on dismount', () => {
    const { unmount } = renderHook(() =>
      useNotifyDataReady({
        topic: MOCK_TOPIC,
        options: MOCK_OPTIONS,
      })
    )
    unmount()
    expect(appShellListener).toHaveBeenCalled()
  })

  it('should still clean up the listener if the hostname changes to null after subscribing', () => {
    const { unmount, rerender } = renderHook(() =>
      useNotifyDataReady({
        hostOverride: MOCK_HOST_CONFIG,
        topic: MOCK_TOPIC,
        options: MOCK_OPTIONS,
      })
    )
    rerender({ hostOverride: null })
    unmount()
    expect(appShellListener).toHaveBeenCalledWith(
      expect.objectContaining({ hostname: MOCK_HOST_CONFIG.hostname })
    )
  })

  it('should not utilize notifications if the feature flag is set to true', () => {
    when(vi.mocked(useFeatureFlag))
      .calledWith('forceHttpPolling')
      .thenReturn(true)

    const { result } = renderHook(() =>
      useNotifyDataReady({
        topic: MOCK_TOPIC,
        options: MOCK_OPTIONS,
      } as any)
    )

    expect(result.current.shouldRefetch).toEqual(false)
    expect(appShellListener).not.toHaveBeenCalled()
  })

  it('should return queryOptionsNotify with modified onSettled and refetchInterval', () => {
    const { result } = renderHook(() =>
      useNotifyDataReady({
        topic: MOCK_TOPIC,
        options: {
          ...MOCK_OPTIONS,
          onSettled: vi.fn(),
          refetchInterval: 5000,
        },
      } as any)
    )
    expect(result.current.queryOptionsNotify.onSettled).toBeDefined()
    expect(result.current.queryOptionsNotify.refetchInterval).toBe(false)
  })

  it('should call the original onSettled function when notifications are disabled', () => {
    const mockOnSettled = vi.fn()
    const { result } = renderHook(() =>
      useNotifyDataReady({
        topic: MOCK_TOPIC,
        options: {
          ...MOCK_OPTIONS,
          forceHttpPolling: true,
          onSettled: mockOnSettled,
        },
      } as any)
    )
    result.current.queryOptionsNotify.onSettled?.(undefined, null)
    expect(mockOnSettled).toHaveBeenCalled()
  })

  it('should enable notifications if `enabled` is initially false and then becomes true', () => {
    const { rerender, result } = renderHook(
      props =>
        useNotifyDataReady({
          topic: MOCK_TOPIC,
          options: props,
        }),
      { initialProps: { enabled: false, refetchInterval: 5000 } }
    )
    expect(result.current.shouldRefetch).toEqual(false)

    rerender({ enabled: true, refetchInterval: 5000 })

    expect(result.current.shouldRefetch).toEqual(true)
  })
})
