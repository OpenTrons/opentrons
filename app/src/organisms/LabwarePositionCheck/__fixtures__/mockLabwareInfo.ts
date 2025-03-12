import type { LwGeometryDetails } from '/app/redux/protocol-runs'

export const mockLabwareInfo: Record<string, LwGeometryDetails> = {
  'labware-uri-1': {
    id: 'labware-1',
    displayName: 'Labware 1',
    defaultOffsetDetails: {
      existingOffset: null,
      workingOffset: null,
      locationDetails: {
        kind: 'default',
        slotName: 'C2',
        labwareId: 'labware-1',
        definitionUri: 'def-uri-1',
      },
    },
    locationSpecificOffsetDetails: [],
  },
  'labware-uri-2': {
    id: 'labware-2',
    displayName: 'Labware 2',
    defaultOffsetDetails: {
      existingOffset: {
        createdAt: '2025-03-01T12:00:00Z',
        vector: { x: 0.1, y: 0.2, z: 0.3 },
      },
      workingOffset: null,
      locationDetails: {
        kind: 'default',
        slotName: 'C2',
        labwareId: 'labware-2',
        definitionUri: 'def-uri-2',
      },
    },
    locationSpecificOffsetDetails: [
      {
        existingOffset: {
          createdAt: '2025-03-01T12:00:00Z',
          vector: { x: 0.1, y: 0.2, z: 0.3 },
        },
        workingOffset: null,
        locationDetails: {
          kind: 'location-specific',
          slotName: 'A1',
          labwareId: 'labware-2',
          definitionUri: 'def-uri-2',
        },
      },
      {
        existingOffset: null,
        workingOffset: null,
        locationDetails: {
          kind: 'location-specific',
          slotName: 'B2',
          labwareId: 'labware-2',
          definitionUri: 'def-uri-2',
        },
      },
    ],
  },
}
