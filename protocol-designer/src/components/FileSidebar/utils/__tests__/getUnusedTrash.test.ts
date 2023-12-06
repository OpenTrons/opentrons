import { getUnusedTrash } from '../getUnusedTrash'
import {
  CreateCommand,
  EIGHT_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
  ONE_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
} from '@opentrons/shared-data'
import type { AdditionalEquipment } from '../../FileSidebar'

describe('getUnusedTrash', () => {
  it('returns true for unused trash bin', () => {
    const mockTrashId = 'mockTrashId'
    const mockTrash = {
      [mockTrashId]: {
        name: 'trashBin',
        id: mockTrashId,
        location: 'cutoutA3',
      },
    } as AdditionalEquipment

    expect(getUnusedTrash(mockTrash, [])).toEqual({
      trashBinUnused: true,
      wasteChuteUnused: false,
    })
  })
  it('returns false for unused trash bin', () => {
    const mockTrashId = 'mockTrashId'
    const mockTrash = {
      [mockTrashId]: {
        name: 'trashBin',
        id: mockTrashId,
        location: 'cutoutA3',
      },
    } as AdditionalEquipment
    const mockCommand = ([
      {
        labwareId: {
          commandType: 'moveToAddressableArea',
          params: { adressableAreaName: 'cutoutA3' },
        },
      },
    ] as unknown) as CreateCommand[]

    expect(getUnusedTrash(mockTrash, mockCommand)).toEqual({
      trashBinUnused: true,
      wasteChuteUnused: false,
    })
  })
  it('returns true for unused waste chute', () => {
    const wasteChute = 'wasteChuteId'
    const mockAdditionalEquipment = {
      [wasteChute]: {
        name: 'wasteChute',
        id: wasteChute,
        location: 'cutoutD3',
      },
    } as AdditionalEquipment
    expect(getUnusedTrash(mockAdditionalEquipment, [])).toEqual({
      trashBinUnused: false,
      wasteChuteUnused: true,
    })
  })
  it('returns false for unused waste chute with single channel', () => {
    const wasteChute = 'wasteChuteId'
    const mockAdditionalEquipment = {
      [wasteChute]: {
        name: 'wasteChute',
        id: wasteChute,
        location: 'cutoutD3',
      },
    } as AdditionalEquipment
    const mockCommand = ([
      {
        labwareId: {
          commandType: 'moveToAddressableArea',
          params: {
            pipetteId: 'mockId',
            addressableAreaName: ONE_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
          },
        },
      },
    ] as unknown) as CreateCommand[]
    expect(getUnusedTrash(mockAdditionalEquipment, mockCommand)).toEqual({
      trashBinUnused: false,
      wasteChuteUnused: true,
    })
  })
  it('returns false for unused waste chute with 8-channel', () => {
    const wasteChute = 'wasteChuteId'
    const mockAdditionalEquipment = {
      [wasteChute]: {
        name: 'wasteChute',
        id: wasteChute,
        location: 'cutoutD3',
      },
    } as AdditionalEquipment
    const mockCommand = ([
      {
        labwareId: {
          commandType: 'moveToAddressableArea',
          params: {
            pipetteId: 'mockId',
            addressableAreaName: EIGHT_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
          },
        },
      },
    ] as unknown) as CreateCommand[]
    expect(getUnusedTrash(mockAdditionalEquipment, mockCommand)).toEqual({
      trashBinUnused: false,
      wasteChuteUnused: true,
    })
  })
})
