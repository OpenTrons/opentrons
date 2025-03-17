import { describe, it, expect } from 'vitest'
import { getShouldShowPipetteType } from '../utils'

const mockLeftPipette = {
  mount: 'left',
  id: 'mockLeft',
  name: 'p50_single_flex',
  pythonName: 'mockPythonName',
} as any
const mockRightPiette = {
  mount: 'right',
  id: 'mockRight',
  name: 'p50_multi_flex',
  pythonName: 'mockPythonName',
} as any

describe('getShouldShowPipetteType', () => {
  it('should always show 1-Channel and 8-Channel pipettes', () => {
    const scenarios = [
      {
        has96Channel: false,
        leftPipette: null,
        rightPipette: null,
        currentEditingMount: null,
      },
      {
        has96Channel: true,
        leftPipette: mockLeftPipette,
        rightPipette: mockRightPiette,
        currentEditingMount: 'left' as any,
      },
    ]

    scenarios.forEach(scenario => {
      expect(
        getShouldShowPipetteType(
          'single',
          scenario.has96Channel,
          scenario.leftPipette,
          scenario.rightPipette,
          scenario.currentEditingMount
        )
      ).toBe(true)
      expect(
        getShouldShowPipetteType(
          'multi',
          scenario.has96Channel,
          scenario.leftPipette,
          scenario.rightPipette,
          scenario.currentEditingMount
        )
      ).toBe(true)
    })
  })

  it('should not show 96-Channel when has96Channel is true', () => {
    expect(getShouldShowPipetteType('96', true, null, null, null)).toBe(false)
    expect(
      getShouldShowPipetteType('96', true, mockLeftPipette, null, 'right')
    ).toBe(false)
  })

  it('should show 96-Channel when adding a new pipette and both mounts are empty', () => {
    expect(getShouldShowPipetteType('96', false, null, null, null)).toBe(true)
  })

  it('should not show 96-Channel when adding a new pipette and one mount is occupied', () => {
    expect(
      getShouldShowPipetteType('96', false, mockLeftPipette, null, null)
    ).toBe(false)
    expect(
      getShouldShowPipetteType('96', false, null, mockRightPiette, null)
    ).toBe(false)
  })

  it('should show 96-Channel when editing left mount and right is empty', () => {
    expect(
      getShouldShowPipetteType('96', false, mockLeftPipette, null, 'left')
    ).toBe(true)
  })

  it('should show 96-Channel when editing right mount and left is empty', () => {
    expect(
      getShouldShowPipetteType('96', false, null, mockRightPiette, 'right')
    ).toBe(true)
  })

  it('should not show 96-Channel when editing a mount and the other is occupied', () => {
    expect(
      getShouldShowPipetteType(
        '96',
        false,
        mockLeftPipette,
        mockRightPiette,
        'left'
      )
    ).toBe(false)
    expect(
      getShouldShowPipetteType(
        '96',
        false,
        mockLeftPipette,
        mockRightPiette,
        'right'
      )
    ).toBe(false)
  })
})
