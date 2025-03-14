import { describe, it, expect } from 'vitest'
import { fixtureTiprack10ul } from '@opentrons/shared-data'
import { getFinalLabwareLocation } from '../getFinalLabwareLocation'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

describe('getFinalLabwareLocation', () => {
  it('calculates labware location after only load_labware', () => {
    const labwareId = 'fakeLabwareId'
    const location = { slotName: 'C3' }
    expect(
      getFinalLabwareLocation(labwareId, [
        {
          id: 'fakeId1',
          commandType: 'loadLabware',
          params: {
            location,
            loadName: 'fakeLoadname',
            namespace: 'opentrons',
            version: 1,
          },
          result: {
            labwareId,
            definition: fixtureTiprack10ul as LabwareDefinition2,
            offset: { x: 1, y: 2, z: 3 },
          },
          status: 'succeeded',
          createdAt: 'fake_timestamp',
          startedAt: 'fake_timestamp',
          completedAt: 'fake_timestamp',
        },
      ]).location
    ).toBe(location)
  })
  it('calculates labware location after only load_labware and move_labware', () => {
    const labwareId = 'fakeLabwareId'
    const initialLocation = { slotName: 'C3' }
    const finalLocation = { slotName: 'D1' }
    expect(
      getFinalLabwareLocation(labwareId, [
        {
          id: 'fakeId1',
          commandType: 'loadLabware',
          params: {
            location: initialLocation,
            loadName: 'fakeLoadname',
            namespace: 'opentrons',
            version: 1,
          },
          result: {
            labwareId,
            definition: fixtureTiprack10ul as LabwareDefinition2,
            offset: { x: 1, y: 2, z: 3 },
          },
          status: 'succeeded',
          createdAt: 'fake_timestamp',
          startedAt: 'fake_timestamp',
          completedAt: 'fake_timestamp',
        },
        {
          id: 'fakeId2',
          commandType: 'moveLabware',
          params: {
            labwareId,
            newLocation: finalLocation,
            strategy: 'usingGripper',
          },
          status: 'succeeded',
          createdAt: 'fake_timestamp',
          startedAt: 'fake_timestamp',
          completedAt: 'fake_timestamp',
        },
      ]).location
    ).toBe(finalLocation)
  })
  it('calculates labware location after multiple moves', () => {
    const labwareId = 'fakeLabwareId'
    const initialLocation = { slotName: 'C3' }
    const secondLocation = { slotName: 'D1' }
    const finalLocation = { slotName: 'A2' }
    expect(
      getFinalLabwareLocation(labwareId, [
        {
          id: 'fakeId1',
          commandType: 'loadLabware',
          params: {
            location: initialLocation,
            loadName: 'fakeLoadname',
            namespace: 'opentrons',
            version: 1,
          },
          result: {
            labwareId,
            definition: fixtureTiprack10ul as LabwareDefinition2,
            offset: { x: 1, y: 2, z: 3 },
          },
          status: 'succeeded',
          createdAt: 'fake_timestamp',
          startedAt: 'fake_timestamp',
          completedAt: 'fake_timestamp',
        },
        {
          id: 'fakeId2',
          commandType: 'moveLabware',
          params: {
            labwareId,
            newLocation: secondLocation,
            strategy: 'usingGripper',
          },
          status: 'succeeded',
          createdAt: 'fake_timestamp',
          startedAt: 'fake_timestamp',
          completedAt: 'fake_timestamp',
        },
        {
          id: 'fakeId3',
          commandType: 'moveLabware',
          params: {
            labwareId,
            newLocation: finalLocation,
            strategy: 'usingGripper',
          },
          status: 'succeeded',
          createdAt: 'fake_timestamp',
          startedAt: 'fake_timestamp',
          completedAt: 'fake_timestamp',
        },
      ]).location
    ).toBe(finalLocation)
  })
})
