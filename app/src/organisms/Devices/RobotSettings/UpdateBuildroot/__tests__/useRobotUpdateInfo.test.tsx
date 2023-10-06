import { renderHook } from '@testing-library/react-hooks'
import { useRobotUpdateInfo } from '../useRobotUpdateInfo'
import { RobotUpdateSession } from '../../../../../redux/robot-update/types'

describe('useRobotUpdateInfo', () => {
  const mockRobotUpdateSession: RobotUpdateSession | null = {
    robotName: 'testRobot',
    fileInfo: { isManualFile: true, systemFile: 'testFile', version: '1.0.0' },
    token: null,
    pathPrefix: null,
    step: 'getToken',
    stage: 'validating',
    progress: 50,
    error: null,
  }

  it('should return initial values when session is null', () => {
    const { result } = renderHook(() => useRobotUpdateInfo(null))

    expect(result.current.updateStep).toBe('initial')
    expect(result.current.progressPercent).toBe(0)
  })

  it('should return initial values when there is no session step and stage', () => {
    const { result } = renderHook(session => useRobotUpdateInfo(session), {
      initialProps: {
        ...mockRobotUpdateSession,
        step: null,
        stage: null,
      },
    })

    expect(result.current.updateStep).toBe('initial')
    expect(result.current.progressPercent).toBe(0)
  })

  it('should update updateStep and progressPercent when session is provided', () => {
    const { result, rerender } = renderHook(
      session => useRobotUpdateInfo(session),
      {
        initialProps: mockRobotUpdateSession,
      }
    )

    expect(result.current.updateStep).toBe('install')
    expect(result.current.progressPercent).toBe(25)

    rerender({
      ...mockRobotUpdateSession,
      step: 'restart',
      stage: 'ready-for-restart',
      progress: 100,
      error: null,
    })

    expect(result.current.updateStep).toBe('restart')
    expect(result.current.progressPercent).toBe(100)
  })

  it('should return correct updateStep and progressPercent values when there is an error', () => {
    const { result, rerender } = renderHook(
      session => useRobotUpdateInfo(session),
      {
        initialProps: mockRobotUpdateSession,
      }
    )

    expect(result.current.updateStep).toBe('install')
    expect(result.current.progressPercent).toBe(25)

    rerender({
      ...mockRobotUpdateSession,
      error: 'Something went wrong',
    })

    expect(result.current.updateStep).toBe('error')
    expect(result.current.progressPercent).toBe(25)
  })

  it('should calculate correct progressPercent when the update is not manual', () => {
    const { result } = renderHook(session => useRobotUpdateInfo(session), {
      initialProps: {
        ...mockRobotUpdateSession,
        fileInfo: {
          systemFile: 'downloadPath',
          version: '1.0.0',
          isManualFile: false,
        },
      },
    })

    expect(result.current.updateStep).toBe('install')
    expect(result.current.progressPercent).toBe(25)
  })
})
