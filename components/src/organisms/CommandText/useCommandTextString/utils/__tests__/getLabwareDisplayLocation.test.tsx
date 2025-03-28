import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { useTranslation } from 'react-i18next'

import {
  FLEX_ROBOT_TYPE,
  getModuleDisplayName,
  getModuleType,
  getOccludedSlotCountForModule,
  getLabwareDefURI,
  getLabwareDisplayName,
} from '@opentrons/shared-data'
import { renderWithProviders } from '../../../../../testing/utils'
import { i18n } from '../../../../../i18n'
import { getLabwareDisplayLocation } from '../getLabwareDisplayLocation'
import { getModuleDisplayLocation } from '../getModuleDisplayLocation'
import { getModuleModel } from '../getModuleModel'

import type { ComponentProps } from 'react'
import type { LabwareLocation } from '@opentrons/shared-data'

vi.mock('../getModuleModel')
vi.mock('../getModuleDisplayLocation')
vi.mock('@opentrons/shared-data', async () => {
  const actual = await vi.importActual('@opentrons/shared-data')
  return {
    ...actual,
    getModuleDisplayName: vi.fn(),
    getModuleType: vi.fn(),
    getOccludedSlotCountForModule: vi.fn(),
    getLabwareDefURI: vi.fn(),
    getLabwareDisplayName: vi.fn(),
  }
})

const TestWrapper = ({
  location,
  params,
}: {
  location: LabwareLocation | null
  params: any
}) => {
  const { t } = useTranslation('protocol_command_text')
  const displayLocation = getLabwareDisplayLocation({ ...params, location, t })
  return <div>{displayLocation}</div>
}

const render = (props: ComponentProps<typeof TestWrapper>) => {
  return renderWithProviders(<TestWrapper {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('getLabwareDisplayLocation with translations', () => {
  const defaultParams = {
    loadedLabwares: [],
    loadedModules: [],
    robotType: FLEX_ROBOT_TYPE,
    allRunDefs: [],
  }

  it('should return an empty string for null location', () => {
    render({ location: null, params: defaultParams })
    expect(screen.queryByText(/.+/)).toBeNull()
  })

  it('should return "off deck" for offDeck location', () => {
    render({ location: 'offDeck', params: defaultParams })

    screen.getByText('off deck')
  })

  it('should return a slot name for slot location', () => {
    render({ location: { slotName: 'A1' }, params: defaultParams })

    screen.getByText('Slot A1')
  })

  it('should return an addressable area name for an addressable area location', () => {
    render({ location: { addressableAreaName: 'B2' }, params: defaultParams })

    screen.getByText('Slot B2')
  })

  it('should return a module location for a module location', () => {
    const mockModuleModel = 'temperatureModuleV2'
    vi.mocked(getModuleModel).mockReturnValue(mockModuleModel)
    vi.mocked(getModuleDisplayLocation).mockReturnValue('3')
    vi.mocked(getModuleDisplayName).mockReturnValue('Temperature Module')
    vi.mocked(getModuleType).mockReturnValue('temperatureModuleType')
    vi.mocked(getOccludedSlotCountForModule).mockReturnValue(1)

    render({ location: { moduleId: 'temp123' }, params: defaultParams })

    screen.getByText('Temperature Module in Slot 3')
  })

  it('should return an adapter location for an adapter location', () => {
    const mockLoadedLabwares = [
      {
        id: 'adapter123',
        definitionUri: 'adapter-uri',
        location: { slotName: 'D1' },
      },
    ]
    const mockAllRunDefs = [
      { uri: 'adapter-uri', metadata: { displayName: 'Mock Adapter' } },
    ]
    vi.mocked(getLabwareDefURI).mockReturnValue('adapter-uri')
    vi.mocked(getLabwareDisplayName).mockReturnValue('Mock Adapter')

    render({
      location: { labwareId: 'adapter123' },
      params: {
        ...defaultParams,
        loadedLabwares: mockLoadedLabwares,
        allRunDefs: mockAllRunDefs,
        detailLevel: 'full',
      },
    })

    screen.getByText('Mock Adapter in Slot D1')
  })

  it('should return a slot-only location when detailLevel is "slot-only"', () => {
    render({
      location: { slotName: 'C1' },
      params: { ...defaultParams, detailLevel: 'slot-only' },
    })

    screen.getByText('Slot C1')
  })

  it('should special case the slotName if it contains "waste chute"', () => {
    render({
      location: { slotName: 'gripperWasteChute' },
      params: { ...defaultParams, detailLevel: 'slot-only' },
    })

    screen.getByText('Waste Chute')
  })

  it('should special case the slotName if it contains "trash bin"', () => {
    render({
      location: { slotName: 'trashBin' },
      params: { ...defaultParams, detailLevel: 'slot-only' },
    })

    screen.getByText('Trash Bin')
  })

  it('should handle an adapter on module location when the detail level is full', () => {
    const mockLoadedLabwares = [
      {
        id: 'adapter123',
        definitionUri: 'adapter-uri',
        location: { moduleId: 'temp123' },
      },
    ]
    const mockLoadedModules = [{ id: 'temp123', model: 'temperatureModuleV2' }]
    const mockAllRunDefs = [
      { uri: 'adapter-uri', metadata: { displayName: 'Mock Adapter' } },
    ]

    vi.mocked(getLabwareDefURI).mockReturnValue('adapter-uri')
    vi.mocked(getLabwareDisplayName).mockReturnValue('Mock Adapter')
    vi.mocked(getModuleDisplayLocation).mockReturnValue('2')
    vi.mocked(getModuleDisplayName).mockReturnValue('Temperature Module')
    vi.mocked(getModuleType).mockReturnValue('temperatureModuleType')
    vi.mocked(getOccludedSlotCountForModule).mockReturnValue(1)

    render({
      location: { labwareId: 'adapter123' },
      params: {
        ...defaultParams,
        loadedLabwares: mockLoadedLabwares,
        loadedModules: mockLoadedModules,
        allRunDefs: mockAllRunDefs,
        detailLevel: 'full',
      },
    })

    screen.getByText('Mock Adapter on Temperature Module in Slot 2')
  })
})
