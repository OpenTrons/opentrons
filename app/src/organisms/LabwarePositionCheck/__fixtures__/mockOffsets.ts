import type {
  DefaultOffsetDetails,
  LocationSpecificOffsetDetailsWithCopy,
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
    addressableAreaName: 'C2',
    labwareId: 'labware-1',
    definitionUri: 'def-uri-1',
    lwOffsetLocSeq: 'anyLocation',
    lwModOnlyStackupDetails: [
      { kind: 'labware', labwareUri: 'def-uri-1', id: '123' },
    ],
  },
}

export const mockDefaultOffsetDetailsWithOffset: DefaultOffsetDetails = {
  existingOffset: {
    createdAt: '2025-03-01T12:00:00Z',
    vector: { x: 0.1, y: 0.2, z: 0.3 },
    id: '123',
  },
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
}

export const mockLocationSpecificOffsetDetails: LocationSpecificOffsetDetailsWithCopy[] = [
  {
    existingOffset: {
      createdAt: '2025-03-01T12:00:00Z',
      vector: { x: 0.1, y: 0.2, z: 0.3 },
      id: '123',
    },
    workingOffset: null,
    locationDetails: {
      kind: 'location-specific',
      addressableAreaName: 'C1',
      labwareId: 'labware-1',
      definitionUri: 'def-uri-1',
      hardCodedOffsetId: null,
      lwOffsetLocSeq: [
        {
          kind: 'onAddressableArea',
          addressableAreaName: 'C1',
        },
      ],
      lwModOnlyStackupDetails: [
        { kind: 'labware', labwareUri: 'def-uri-1', id: '123' },
      ],
    },
    slotCopy: 'C1',
  },
  {
    existingOffset: null,
    workingOffset: null,
    locationDetails: {
      kind: 'location-specific',
      addressableAreaName: 'A2',
      labwareId: 'labware-1',
      definitionUri: 'def-uri-1',
      hardCodedOffsetId: null,
      lwOffsetLocSeq: [
        {
          kind: 'onAddressableArea',
          addressableAreaName: 'A2',
        },
      ],
      lwModOnlyStackupDetails: [
        { kind: 'labware', labwareUri: 'def-uri-1', id: '123' },
      ],
    },
    slotCopy: 'A2',
  },
  {
    existingOffset: {
      createdAt: '2025-03-01T12:00:00Z',
      vector: { x: 0.4, y: 0.5, z: 0.6 },
      id: '123',
    },
    workingOffset: null,
    locationDetails: {
      kind: 'location-specific',
      addressableAreaName: 'B3',
      closestBeneathModuleId: 'module-1',
      labwareId: 'labware-2',
      definitionUri: 'def-uri-2',
      hardCodedOffsetId: null,
      lwOffsetLocSeq: [
        {
          kind: 'onAddressableArea',
          addressableAreaName: 'B3',
        },
      ],
      lwModOnlyStackupDetails: [
        { kind: 'labware', labwareUri: 'def-uri-1', id: '123' },
      ],
    },
    slotCopy: 'B3',
  },
]
