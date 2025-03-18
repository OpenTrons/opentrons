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
        addressableAreaName: 'C2',
        labwareId: 'labware-1',
        definitionUri: 'def-uri-1',
        lwOffsetLocSeq: 'anyLocation',
        lwModOnlyStackupDetails: [
          { kind: 'labware', labwareUri: 'def-uri-1', id: '123' },
        ],
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
        id: '123',
      },
      workingOffset: null,
      locationDetails: {
        kind: 'default',
        addressableAreaName: 'C2',
        labwareId: 'labware-2',
        definitionUri: 'def-uri-2',
        lwOffsetLocSeq: 'anyLocation',
        lwModOnlyStackupDetails: [
          { kind: 'labware', labwareUri: 'def-uri-2', id: '123' },
        ],
      },
    },
    locationSpecificOffsetDetails: [
      {
        existingOffset: {
          createdAt: '2025-03-01T12:00:00Z',
          vector: { x: 0.1, y: 0.2, z: 0.3 },
          id: '123',
        },
        workingOffset: null,
        locationDetails: {
          kind: 'location-specific',
          hardCodedOffsetId: null,
          addressableAreaName: 'A1',
          labwareId: 'labware-2',
          definitionUri: 'def-uri-2',
          lwOffsetLocSeq: [
            {
              kind: 'onAddressableArea',
              addressableAreaName: 'C2',
            },
          ],
          lwModOnlyStackupDetails: [
            { kind: 'labware', labwareUri: 'def-uri-2', id: '123' },
          ],
        },
      },
      {
        existingOffset: null,
        workingOffset: null,
        locationDetails: {
          kind: 'location-specific',
          addressableAreaName: 'B2',
          labwareId: 'labware-2',
          definitionUri: 'def-uri-2',
          lwOffsetLocSeq: [
            {
              kind: 'onAddressableArea',
              addressableAreaName: 'C1',
            },
          ],

          hardCodedOffsetId: null,
          lwModOnlyStackupDetails: [
            { kind: 'labware', labwareUri: 'def-uri-2', id: 'labware-2' },
          ],
        },
      },
    ],
  },
}
