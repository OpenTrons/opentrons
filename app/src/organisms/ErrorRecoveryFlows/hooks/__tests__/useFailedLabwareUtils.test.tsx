import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  getRelevantWellName,
  getRelevantFailedLabwareCmdFrom,
  useRelevantFailedLwLocations,
} from '../useFailedLabwareUtils'
import { DEFINED_ERROR_TYPES } from '../../constants'

import type { ComponentProps } from 'react'
import type { GetRelevantLwLocationsParams } from '../useFailedLabwareUtils'

describe('getRelevantWellName', () => {
  const failedPipetteInfo = {
    data: {
      channels: 8,
    },
  } as any

  const recentRelevantPickUpTipCmd = {
    params: {
      pipetteId: 'pipetteId',
      labwareId: 'labwareId',
      wellName: 'A1',
    },
  } as any

  it('should return an empty string if failedPipetteInfo is null', () => {
    const result = getRelevantWellName(null, recentRelevantPickUpTipCmd)
    expect(result).toBe('')
  })

  it('should return an empty string if recentRelevantPickUpTipCmd is null', () => {
    const result = getRelevantWellName(failedPipetteInfo, null)
    expect(result).toBe('')
  })

  it('should return the wellName if the pipette has 1 channel', () => {
    const result = getRelevantWellName(
      { ...failedPipetteInfo, data: { channels: 1 } },
      recentRelevantPickUpTipCmd
    )
    expect(result).toBe('A1')
  })

  it('should return a range of well names if the pipette has 8 channels', () => {
    const result = getRelevantWellName(
      failedPipetteInfo,
      recentRelevantPickUpTipCmd
    )
    expect(result).toBe('A1 - H1')
  })

  it('should return the wellName if the pipette has 96 channels', () => {
    const result = getRelevantWellName(
      { ...failedPipetteInfo, data: { channels: 96 } },
      recentRelevantPickUpTipCmd
    )
    expect(result).toBe('A1')
  })

  it('should handle different wellName formats correctly', () => {
    const result = getRelevantWellName(failedPipetteInfo, {
      ...recentRelevantPickUpTipCmd,
      params: { ...recentRelevantPickUpTipCmd.params, wellName: 'B12' },
    })
    expect(result).toBe('A12 - H12')
  })
})

describe('getRelevantFailedLabwareCmdFrom', () => {
  const failedCommand = {
    error: {
      errorType: DEFINED_ERROR_TYPES.LIQUID_NOT_FOUND,
    },
    params: {
      wellName: 'A1',
      pipetteId: 'pipetteId',
    },
  } as any

  it('should return the failedCommand for NO_LIQUID_DETECTED error kind', () => {
    const failedLiquidProbeCommand = {
      ...failedCommand,
      commandType: 'liquidProbe',
      error: {
        isDefined: true,
        errorType: DEFINED_ERROR_TYPES.LIQUID_NOT_FOUND,
      },
    }
    const result = getRelevantFailedLabwareCmdFrom({
      failedCommandByRunRecord: failedLiquidProbeCommand,
    })
    expect(result).toEqual(failedLiquidProbeCommand)
  })

  it('should return the relevant pickUpTip command for overpressure error kinds', () => {
    const pickUpTipCommand = {
      commandType: 'pickUpTip',
      params: {
        pipetteId: 'pipetteId',
        labwareId: 'labwareId',
        wellName: 'A1',
      },
    } as any
    const runCommands = {
      data: [pickUpTipCommand, failedCommand],
    } as any

    const overpressureErrorKinds = [
      ['aspirate', DEFINED_ERROR_TYPES.OVERPRESSURE],
      ['dispense', DEFINED_ERROR_TYPES.OVERPRESSURE],
    ]

    overpressureErrorKinds.forEach(([commandType, errorType]) => {
      const result = getRelevantFailedLabwareCmdFrom({
        failedCommandByRunRecord: {
          ...failedCommand,
          commandType,
          error: { isDefined: true, errorType },
        },
        runCommands,
      })
      expect(result).toBe(pickUpTipCommand)
    })
  })

  it('should return the failedCommand for GRIPPER_ERROR error kind', () => {
    const failedGripperCommand = {
      ...failedCommand,
      commandType: 'moveLabware',
      error: {
        isDefined: true,
        errorType: DEFINED_ERROR_TYPES.GRIPPER_MOVEMENT,
      },
    }
    const result = getRelevantFailedLabwareCmdFrom({
      failedCommandByRunRecord: failedGripperCommand,
    })
    expect(result).toEqual(failedGripperCommand)
  })

  it('should return null for GENERAL_ERROR error kind', () => {
    const result = getRelevantFailedLabwareCmdFrom({
      failedCommandByRunRecord: {
        ...failedCommand,
        error: { errorType: 'literally anything else' },
      },
    })
    expect(result).toBeNull()
  })

  it('should return null for unhandled error kinds', () => {
    const result = getRelevantFailedLabwareCmdFrom({
      failedCommandByRunRecord: {
        ...failedCommand,
        error: { errorType: 'SOME_UNHANDLED_ERROR' },
      },
    })
    expect(result).toBeNull()
  })
})

const TestWrapper = (props: GetRelevantLwLocationsParams) => {
  const displayLocation = useRelevantFailedLwLocations(props)
  return (
    <>
      <div>{`Current Loc: ${displayLocation.currentLoc}`}</div>
      <div>{`New Loc: ${displayLocation.newLoc}`}</div>
    </>
  )
}

const render = (props: ComponentProps<typeof TestWrapper>) => {
  return renderWithProviders(<TestWrapper {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('useRelevantFailedLwLocations', () => {
  const mockProtocolAnalysis = {} as any
  const mockFailedLabware = {
    location: { slotName: 'D1' },
  } as any

  it('should return current location for non-moveLabware commands', () => {
    const mockFailedCommand = {
      commandType: 'aspirate',
    } as any

    render({
      failedLabware: mockFailedLabware,
      failedCommandByRunRecord: mockFailedCommand,
      protocolAnalysis: mockProtocolAnalysis,
    })

    screen.getByText('Current Loc: Slot D1')
    screen.getByText('New Loc: null')
  })

  it('should return current and new location for moveLabware commands', () => {
    const mockFailedCommand = {
      commandType: 'moveLabware',
      params: {
        newLocation: { slotName: 'C2' },
      },
    } as any

    render({
      failedLabware: mockFailedLabware,
      failedCommandByRunRecord: mockFailedCommand,
      protocolAnalysis: mockProtocolAnalysis,
    })

    screen.getByText('Current Loc: Slot D1')
    screen.getByText('New Loc: Slot C2')
  })
})
