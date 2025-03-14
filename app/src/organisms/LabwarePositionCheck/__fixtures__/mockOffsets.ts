import type {
  DefaultOffsetDetails,
  LocationSpecificOffsetDetails,
} from '/app/redux/protocol-runs'

export const mockOffset = {
  offset: { x: 0.5, y: 1.2, z: -0.3 },
  timestamp: '2025-03-01T12:00:00Z',
}

export const mockDefaultOffsetDetails: DefaultOffsetDetails = {
  existingOffset: null,
  workingOffset: null,
  locationDetails: {
    kind: 'default',
    slotName: 'C2',
    labwareId: 'labware-1',
    definitionUri: 'def-uri-1',
  },
}

export const mockDefaultOffsetDetailsWithOffset: DefaultOffsetDetails = {
  existingOffset: {
    createdAt: '2025-03-01T12:00:00Z',
    vector: { x: 0.1, y: 0.2, z: 0.3 },
  },
  workingOffset: null,
  locationDetails: {
    kind: 'default',
    slotName: 'C2',
    labwareId: 'labware-1',
    definitionUri: 'def-uri-1',
  },
}

export const mockLocationSpecificOffsetDetails: LocationSpecificOffsetDetails[] = [
  {
    existingOffset: {
      createdAt: '2025-03-01T12:00:00Z',
      vector: { x: 0.1, y: 0.2, z: 0.3 },
    },
    workingOffset: null,
    locationDetails: {
      kind: 'location-specific',
      slotName: 'C1',
      labwareId: 'labware-1',
      definitionUri: 'def-uri-1',
    },
  },
  {
    existingOffset: null,
    workingOffset: null,
    locationDetails: {
      kind: 'location-specific',
      slotName: 'A2',
      labwareId: 'labware-1',
      definitionUri: 'def-uri-1',
    },
  },
  {
    existingOffset: {
      createdAt: '2025-03-01T12:00:00Z',
      vector: { x: 0.4, y: 0.5, z: 0.6 },
    },
    workingOffset: null,
    locationDetails: {
      kind: 'location-specific',
      slotName: 'B3',
      moduleId: 'module-1',
      labwareId: 'labware-2',
      definitionUri: 'def-uri-2',
    },
  },
]
