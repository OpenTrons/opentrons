import {
  LabwareDefinition2,
  ModuleDefinition,
  SPAN7_8_10_11_SLOT,
} from '@opentrons/shared-data'
import thermocyclerModuleV1 from '@opentrons/shared-data/module/definitions/3/thermocyclerModuleV1.json'

import type { RunData } from '@opentrons/api-client'
import type {
  LabwareDefinitionsByUri,
  LoadedLabware,
  LoadedModule,
} from '@opentrons/shared-data'

export const longCommandMessage =
  'This is a user generated message that gives details about the pause command. This text is truncated to 220 characters. semper risus in hendrerit gravida rutrum quisque non tellus orci ac auctor augue mauris augue neque gravida in fermentum et sollicitudin ac orci phasellus egestas tellus rutrum tellus pellentesque'

export const truncatedCommandMessage =
  'This is a user generated message that gives details about the pause command. This text is truncated to 220 characters. semper risus in hendrerit gravida rutrum quisque non tellus orci ac auctor augue mauris augue nequ...'

export const shortCommandMessage =
  "this won't get truncated because it isn't more than 220 characters."

export const MOCK_LABWARE_ID = '71e1664f-3e69-400a-931b-1ddfa3bff5c8'
export const MOCK_MODULE_ID = 'f806ff9f-3b17-4692-aa63-f77c57fe18d1'

export const mockPauseCommandWithStartTime = {
  commandType: 'waitForResume',
  params: {
    startedAt: new Date(),
    message: longCommandMessage,
  },
} as any

export const mockPauseCommandWithoutStartTime = {
  commandType: 'waitForResume',
  params: {
    startedAt: null,
    message: longCommandMessage,
  },
} as any

export const mockPauseCommandWithShortMessage = {
  commandType: 'waitForResume',
  params: {
    startedAt: null,
    message: shortCommandMessage,
  },
} as any

export const mockPauseCommandWithNoMessage = {
  commandType: 'waitForResume',
  params: {
    startedAt: null,
    message: null,
  },
} as any

export const mockMoveLabwareCommandFromSlot = {
  commandType: 'moveLabware',
  params: {
    labwareId: 'mockLabwareID2',
    newLocation: {
      slotName: '5',
    },
    strategy: 'manualMoveWithPause',
  },
} as any

export const mockMoveLabwareCommandFromModule = {
  commandType: 'moveLabware',
  params: {
    labwareId: 'mockLabwareID',
    newLocation: {
      slotName: '5',
    },
    strategy: 'manualMoveWithPause',
  },
} as any

export const mockLabwareOnModule: LoadedLabware = {
  id: 'mockLabwareID',
  loadName: 'nest_96_wellplate_100ul_pcr_full_skirt',
  definitionUri: 'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
  location: {
    moduleId: 'mockModuleID',
  },
}

export const mockLabwareOnSlot: LoadedLabware = {
  id: 'mockLabwareID2',
  loadName: 'nest_96_wellplate_100ul_pcr_full_skirt',
  definitionUri: 'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
  location: {
    slotName: '1',
  },
}

export const mockLabwareDefinition = ({
  schemaVersion: 2,
  version: 1,
  namespace: 'opentrons',
  metadata: {
    displayName: 'NEST 96 Well Plate 100 µL PCR Full Skirt',
    displayCategory: 'wellPlate',
    displayVolumeUnits: 'µL',
    tags: [],
  },
  parameters: {
    format: '96Standard',
    isTiprack: false,
    loadName: 'nest_96_wellplate_100ul_pcr_full_skirt',
    isMagneticModuleCompatible: true,
    magneticModuleEngageHeight: 20,
  },
  cornerOffsetFromSlot: {
    x: 0,
    y: 0,
    z: 0,
  },
  dimensions: {
    yDimension: 85.48,
    zDimension: 15.7,
    xDimension: 127.76,
  },
} as unknown) as LabwareDefinition2

export const mockLabwareDefinitionsByUri = {
  'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1': mockLabwareDefinition,
} as LabwareDefinitionsByUri

export const mockModule: LoadedModule = {
  id: 'mockModuleID',
  model: 'heaterShakerModuleV1',
  location: {
    slotName: '3',
  },
  serialNumber: 'dummySerialHS',
}

export const mockThermocyclerModule: LoadedModule = {
  id: 'mockTCModuleID',
  model: 'thermocyclerModuleV1',
  location: {
    slotName: SPAN7_8_10_11_SLOT,
  },
  serialNumber: 'dummySerialTC',
}

export const mockRunData: RunData = {
  id: 'mockRunData',
  createdAt: '',
  completedAt: '',
  startedAt: '',
  current: true,
  status: 'running',
  actions: [],
  errors: [],
  pipettes: [],
  labware: [mockLabwareOnModule, mockLabwareOnSlot],
  modules: [mockModule],
}

export const mockLabwareRenderInfo = [
  {
    x: 0,
    y: 0,
    labwareId: 'mockLabwareID2',
    labwareDef: mockLabwareDefinition,
  },
]

export const mockModuleRenderInfo = [
  {
    moduleId: 'mockTCModuleID',
    x: 100,
    y: 100,
    moduleDef: (thermocyclerModuleV1 as unknown) as ModuleDefinition,
    nestedLabwareDef: mockLabwareDefinition,
    nestedLabwareId: 'mockLabwareID',
  },
]

// const mockTCModuleDef = {
//   moduleType: 'thermocyclerModuleType',
//   model: 'thermocyclerModuleV1',
//   labwareOffset: {
//     x: 0,
//     y: 82.56,
//     z: 97.8,
//   },
//   dimensions: {
//     bareOverallHeight: 98,
//     overLabwareHeight: 0,
//     lidHeight: 37.7,
//     xDimension: 172,
//     yDimension: 259.7,
//     labwareInterfaceXDimension: 128,
//     labwareInterfaceYDimension: 86,
//   },
//   cornerOffsetFromSlot: {
//     x: -22.125,
//     y: 0,
//     z: 0,
//   },
//   calibrationPoint: {
//     x: 14.4,
//     y: 64.93,
//     z: 97.8,
//   },
//   config: {
//     minBlockTemperature: 0,
//     maxBlockTemperature: 99,
//     minLidTemperature: 37,
//     maxLidTemperature: 110,
//     minBlockVolume: 0,
//     maxBlockVolume: 100,
//   },
//   displayName: 'Thermocycler Module GEN1',
//   quirks: [],
//   slotTransforms: {},
//   compatibleWith: ['thermocyclerModuleV1'],
//   twoDimensionalRendering: {
//     name: 'svg',
//     type: 'element',
//     value: '',
//     attributes: {
//       version: '1.1',
//       id: 'thermocycler',
//       xmlns: 'http://www.w3.org/2000/svg',
//       'xmlns:xlink': 'http://www.w3.org/1999/xlink',
//       x: '0px',
//       y: '0px',
//       viewBox: '0 0 172 258',
//       style: 'enable-background:new 0 0 172 258;',
//       'xml:space': 'preserve',
//     },
//     children: [
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openChassisLightFill',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               style: 'fill:#FFFFFF;',
//               d: 'M144.7,244.4v13.1H27.1v-13.1H1.4V1.5h168.9v242.9H144.7z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openChassisDarkFill',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               style: 'fill:#E6E6E6;',
//               d:
//                 'M141.4,257.5v-48.3c0-0.6-0.5-1.1-1.1-1.1H31.6c-0.6,0-1.1,0.5-1.1,1.1v48.3',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               style: 'fill:#E6E6E6;',
//               d:
//                 'M144.8,245.3v-36.7c0-2.3-1.8-4.1-4.1-4.1H31.2c-2.3,0-4.1,1.8-4.1,4.1v36.7h-22V0.7h161.9v244.6H144.8z\n\t\t\t M130.4,23.6H41.6c-1.7,0-3.1,1.4-3.1,3.1s1.4,3.1,3.1,3.1h88.8c1.7,0,3.1-1.4,3.1-3.1S132.1,23.6,130.4,23.6z M150.3,20.5\n\t\t\tc-3.4,0-6.1,2.7-6.1,6.1s2.7,6.1,6.1,6.1s6.1-2.7,6.1-6.1S153.6,20.5,150.3,20.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               style: 'fill:#E6E6E6;',
//               d:
//                 'M154.3,26.6c0-2.2-1.8-4.1-4.1-4.1s-4.1,1.8-4.1,4.1c0,2.2,1.8,4.1,4.1,4.1C152.5,30.7,154.3,28.9,154.3,26.6\n\t\t\tz',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openWellBlockLightFill',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               style: 'fill:#FFFFFF;',
//               d:
//                 'M149.5,80.3H22.2c-1.6,0-2.9,1.3-2.9,2.9v87.1c0,1.6,1.3,2.9,2.9,2.9h127.3c1.6,0,2.9-1.3,2.9-2.9V83.2\n\t\t\tC152.4,81.6,151.1,80.3,149.5,80.3z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'closedChassisLightFill',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               style: 'fill:#FFFFFF;',
//               d: 'M144.7,244.4v13.1H27.1v-13.1H1.4V1.5h168.9v242.9H144.7z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'closedChassisDarkFill',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               style: 'fill:#E6E6E6;',
//               d:
//                 'M5.1,52.8V0.7h161.9v52.1H5.1z M133.5,26.6c0-1.7-1.4-3.1-3.1-3.1H41.6c-1.7,0-3.1,1.4-3.1,3.1l0,0\n\t\t\tc0,1.7,1.4,3.1,3.1,3.1h88.8C132.1,29.7,133.5,28.3,133.5,26.6L133.5,26.6z M150.3,20.5c-3.4,0-6.1,2.7-6.1,6.1s2.7,6.1,6.1,6.1\n\t\t\ts6.1-2.7,6.1-6.1S153.6,20.5,150.3,20.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               style: 'fill:#E6E6E6;',
//               d:
//                 'M141.4,257.5v-48.3c0-0.6-0.5-1.1-1.1-1.1H31.6c-0.6,0-1.1,0.5-1.1,1.1v48.3',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               style: 'fill:#E6E6E6;',
//               d:
//                 'M144.8,209.1V196c0-3.2-2.6-5.7-5.7-5.7H32.8c-3.2,0-5.7,2.6-5.7,5.7v13.1c0-4.9,4.2-4.6,4.2-4.6h109.4\n\t\t\tC140.7,204.5,144.8,204.2,144.8,209.1z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'buttonDarkFill',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               style: 'fill:#E6E6E6;',
//               d:
//                 'M154.3,26.6c0-2.2-1.8-4.1-4.1-4.1s-4.1,1.8-4.1,4.1c0,2.2,1.8,4.1,4.1,4.1C152.5,30.7,154.3,28.9,154.3,26.6\n\t\t\tz',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'statusLight',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M130.4,23.2H41.6c-1.9,0-3.4,1.5-3.4,3.4s1.5,3.4,3.4,3.4h88.8c1.9,0,3.4-1.5,3.4-3.4C133.8,24.7,132.3,23.2,130.4,23.2z\n\t\t\t M41.6,29.4c-1.5,0-2.7-1.2-2.7-2.7s1.2-2.7,2.7-2.7h88.8c1.5,0,2.7,1.2,2.7,2.7s-1.2,2.7-2.7,2.7H41.6z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'button',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M150.3,17.4c-5.1,0-9.2,4.1-9.2,9.2s4.1,9.2,9.2,9.2c5.1,0,9.2-4.1,9.2-9.2S155.3,17.4,150.3,17.4z M150.3,35.1\n\t\t\tc-4.7,0-8.5-3.8-8.5-8.5s3.8-8.5,8.5-8.5c4.7,0,8.5,3.8,8.5,8.5S154.9,35.1,150.3,35.1z M150.3,20.2c-3.5,0-6.4,2.9-6.4,6.4\n\t\t\ts2.9,6.4,6.4,6.4c3.5,0,6.4-2.9,6.4-6.4S153.8,20.2,150.3,20.2z M150.3,32.4c-3.2,0-5.7-2.6-5.7-5.7s2.6-5.7,5.7-5.7\n\t\t\tc3.2,0,5.7,2.6,5.7,5.7S153.4,32.4,150.3,32.4z M150.3,22.2c-2.4,0-4.4,2-4.4,4.4s2,4.4,4.4,4.4s4.4-2,4.4-4.4\n\t\t\tS152.7,22.2,150.3,22.2z M150.3,30.3c-2,0-3.7-1.7-3.7-3.7s1.7-3.7,3.7-3.7c2,0,3.7,1.7,3.7,3.7S152.3,30.3,150.3,30.3z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openInnerWallEdges',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M140.3,207.8H31.6c-0.8,0-1.4,0.6-1.4,1.4v48.3h0.7v-48.3c0-0.4,0.3-0.7,0.7-0.7h108.7c0.4,0,0.7,0.3,0.7,0.7v48.3h0.7\n\t\t\tv-48.3C141.7,208.5,141.1,207.8,140.3,207.8z M167.3,0.3H4.7v245h0.7V1h161.2v244.3h0.7V0.3z M0.7,4.8h170.6V4.1H0.7V4.8z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openChassisOutline',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d: 'M172,0H0v246h27v-1.4H1.4V1.4h169.2v243.2h-25.8v1.4H172V0z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openlidHingeOutline',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M140.7,203.8H31.2c-2.6,0-4.8,2.2-4.8,4.8v49.6h119.1v-49.6C145.5,206,143.3,203.8,140.7,203.8z M27.8,256.9v-48.2\n\t\t\tc0-1.9,1.5-3.4,3.4-3.4h109.4c1.9,0,3.4,1.5,3.4,3.4v48.2H27.8z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openBlockChamberOutline',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M124.6,69.5h-17c-1.5,0-2.9,0.7-3.8,1.9l-2.8,3.8c-0.4,0.5-1,0.8-1.6,0.8H72.2c-0.6,0-1.3-0.3-1.6-0.8l-2.8-3.8\n\t\t\tc-0.9-1.2-2.3-1.9-3.8-1.9h-17c-1.5,0-2.9,0.7-3.8,1.9l-2.8,3.8c-0.4,0.5-1,0.8-1.6,0.8h-18c-3.4,0-6.2,2.8-6.2,6.2V171\n\t\t\tc0,3.4,2.8,6.2,6.2,6.2h18c0.6,0,1.3,0.3,1.6,0.8l2.7,3.7c0.9,1.2,2.3,1.9,3.8,1.9h17c1.5,0,2.9-0.7,3.8-1.9l2.7-3.7\n\t\t\tc0.4-0.5,1-0.8,1.6-0.8h27.2c0.6,0,1.3,0.3,1.6,0.8l2.7,3.7c0.9,1.2,2.3,1.9,3.8,1.9h17c1.5,0,2.9-0.7,3.8-1.9l2.7-3.7\n\t\t\tc0.4-0.5,1-0.8,1.6-0.8h17.7c3.4,0,6.2-2.8,6.2-6.2V82.1c0-3.4-2.8-6.2-6.2-6.2h-17.7c-0.6,0-1.3-0.3-1.6-0.8l-2.8-3.8\n\t\t\tC127.5,70.2,126.1,69.5,124.6,69.5z M72.2,77.4h27.2c1.1,0,2.1-0.5,2.8-1.4l2.8-3.8c0.6-0.8,1.6-1.3,2.7-1.3h17c1,0,2,0.5,2.7,1.3\n\t\t\tL130,76c0.6,0.9,1.7,1.4,2.8,1.4h17.7c2.6,0,4.8,2.1,4.8,4.8V171c0,2.6-2.1,4.8-4.8,4.8h-17.7c-1.1,0-2.1,0.5-2.8,1.4l-2.7,3.7\n\t\t\tc-0.6,0.8-1.6,1.3-2.7,1.3h-17c-1,0-2-0.5-2.7-1.3l-2.7-3.7c-0.6-0.9-1.7-1.4-2.8-1.4H72.1c-1.1,0-2.1,0.5-2.8,1.4l-2.7,3.7\n\t\t\tc-0.6,0.8-1.6,1.3-2.7,1.3h-17c-1,0-2-0.5-2.7-1.3l-2.7-3.7c-0.6-0.9-1.7-1.4-2.8-1.4h-18c-2.6,0-4.8-2.1-4.8-4.8V82.1\n\t\t\tc0-2.6,2.1-4.8,4.8-4.8h18c1.1,0,2.1-0.5,2.8-1.4l2.8-3.8c0.6-0.8,1.6-1.3,2.7-1.3h17c1,0,2,0.5,2.7,1.3l2.8,3.8\n\t\t\tC70.1,76.8,71.1,77.4,72.2,77.4z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openWellBlockOutline',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M149.5,80H22.2c-1.8,0-3.3,1.5-3.3,3.3v87.1c0,1.8,1.5,3.3,3.3,3.3h127.3c1.8,0,3.3-1.5,3.3-3.3V83.2\n\t\t\tC152.8,81.4,151.3,80,149.5,80z M22.2,172.9c-1.4,0-2.6-1.2-2.6-2.6V83.2c0-1.4,1.2-2.6,2.6-2.6h127.3c1.4,0,2.6,1.2,2.6,2.6v87.2\n\t\t\tc0,1.4-1.2,2.6-2.6,2.6L22.2,172.9L22.2,172.9z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openWellBlockWells',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M35.7,154.6c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S37.8,154.6,35.7,154.6z M35.7,161.6\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C38.9,160.2,37.4,161.6,35.7,161.6z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M35.7,145.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S37.8,145.5,35.7,145.5z M35.7,152.5\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S37.4,152.5,35.7,152.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M35.7,136.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S37.8,136.5,35.7,136.5z M35.7,143.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C38.9,142,37.4,143.4,35.7,143.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M35.7,127.4c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S37.8,127.4,35.7,127.4z M35.7,134.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C38.9,133,37.4,134.4,35.7,134.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M35.7,118.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S37.8,118.3,35.7,118.3z M35.7,125.3\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S37.4,125.3,35.7,125.3z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M35.7,109.2c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C39.6,110.9,37.8,109.2,35.7,109.2z\n\t\t\t M35.7,116.2c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C38.9,114.8,37.4,116.2,35.7,116.2z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M35.7,100.1c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C39.6,101.9,37.8,100.1,35.7,100.1z\n\t\t\t M35.7,107.1c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C38.9,105.7,37.4,107.1,35.7,107.1z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M35.7,91.1c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S37.8,91.1,35.7,91.1z M35.7,98\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S37.4,98,35.7,98z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M44.8,154.6c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S46.9,154.6,44.8,154.6z M44.8,161.6\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C47.9,160.2,46.5,161.6,44.8,161.6z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M44.8,145.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S46.9,145.5,44.8,145.5z M44.8,152.5\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S46.5,152.5,44.8,152.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M44.8,136.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S46.9,136.5,44.8,136.5z M44.8,143.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C47.9,142,46.5,143.4,44.8,143.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M44.8,127.4c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S46.9,127.4,44.8,127.4z M44.8,134.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C47.9,133,46.5,134.4,44.8,134.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M44.8,118.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S46.9,118.3,44.8,118.3z M44.8,125.3\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S46.5,125.3,44.8,125.3z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M44.8,109.2c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C48.6,110.9,46.9,109.2,44.8,109.2z\n\t\t\t M44.8,116.2c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C47.9,114.8,46.5,116.2,44.8,116.2z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M44.8,100.1c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C48.6,101.9,46.9,100.1,44.8,100.1z\n\t\t\t M44.8,107.1c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C47.9,105.7,46.5,107.1,44.8,107.1z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M44.8,91.1c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S46.9,91.1,44.8,91.1z M44.8,98\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S46.5,98,44.8,98z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M53.9,154.6c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S56,154.6,53.9,154.6z M53.9,161.6\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C57,160.2,55.6,161.6,53.9,161.6z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M53.9,145.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S56,145.5,53.9,145.5z M53.9,152.5\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S55.6,152.5,53.9,152.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M53.9,136.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S56,136.5,53.9,136.5z M53.9,143.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C57,142,55.6,143.4,53.9,143.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M53.9,127.4c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S56,127.4,53.9,127.4z M53.9,134.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C57,133,55.6,134.4,53.9,134.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M53.9,118.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S56,118.3,53.9,118.3z M53.9,125.3\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S55.6,125.3,53.9,125.3z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M53.9,109.2c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8C57.7,110.9,56,109.2,53.9,109.2z M53.9,116.2\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C57,114.8,55.6,116.2,53.9,116.2z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M53.9,100.1c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8C57.7,101.9,56,100.1,53.9,100.1z M53.9,107.1\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C57,105.7,55.6,107.1,53.9,107.1z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M53.9,91.1c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S56,91.1,53.9,91.1z M53.9,98c-1.7,0-3.1-1.4-3.1-3.1\n\t\t\ts1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S55.6,98,53.9,98z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M62.9,154.6c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S65.1,154.6,62.9,154.6z M62.9,161.6\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C66.1,160.2,64.7,161.6,62.9,161.6z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M62.9,145.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S65.1,145.5,62.9,145.5z M62.9,152.5\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S64.7,152.5,62.9,152.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M62.9,136.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S65.1,136.5,62.9,136.5z M62.9,143.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C66.1,142,64.7,143.4,62.9,143.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M62.9,127.4c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S65.1,127.4,62.9,127.4z M62.9,134.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C66.1,133,64.7,134.4,62.9,134.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M62.9,118.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S65.1,118.3,62.9,118.3z M62.9,125.3\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S64.7,125.3,62.9,125.3z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M62.9,109.2c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C66.8,110.9,65.1,109.2,62.9,109.2z\n\t\t\t M62.9,116.2c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C66.1,114.8,64.7,116.2,62.9,116.2z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M62.9,100.1c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C66.8,101.9,65.1,100.1,62.9,100.1z\n\t\t\t M62.9,107.1c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C66.1,105.7,64.7,107.1,62.9,107.1z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M62.9,91.1c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S65.1,91.1,62.9,91.1z M62.9,98\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S64.7,98,62.9,98z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M72,154.6c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S74.1,154.6,72,154.6z M72,161.6\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C75.2,160.2,73.8,161.6,72,161.6z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M72,145.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S74.1,145.5,72,145.5z M72,152.5\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S73.8,152.5,72,152.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M72,136.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S74.1,136.5,72,136.5z M72,143.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C75.2,142,73.8,143.4,72,143.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M72,127.4c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S74.1,127.4,72,127.4z M72,134.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C75.2,133,73.8,134.4,72,134.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M72,118.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S74.1,118.3,72,118.3z M72,125.3\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S73.8,125.3,72,125.3z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M72,109.2c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C75.9,110.9,74.1,109.2,72,109.2z\n\t\t\t M72,116.2c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C75.2,114.8,73.8,116.2,72,116.2z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M72,100.1c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C75.9,101.9,74.1,100.1,72,100.1z\n\t\t\t M72,107.1c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C75.2,105.7,73.8,107.1,72,107.1z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M72,91.1c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S74.1,91.1,72,91.1z M72,98\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S73.8,98,72,98z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M81.1,154.6c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S83.2,154.6,81.1,154.6z M81.1,161.6\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C84.3,160.2,82.8,161.6,81.1,161.6z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M81.1,145.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S83.2,145.5,81.1,145.5z M81.1,152.5\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S82.8,152.5,81.1,152.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M81.1,136.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S83.2,136.5,81.1,136.5z M81.1,143.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C84.3,142,82.8,143.4,81.1,143.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M81.1,127.4c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S83.2,127.4,81.1,127.4z M81.1,134.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C84.3,133,82.8,134.4,81.1,134.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M81.1,118.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S83.2,118.3,81.1,118.3z M81.1,125.3\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S82.8,125.3,81.1,125.3z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M81.1,109.2c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8C84.9,110.9,83.2,109.2,81.1,109.2z\n\t\t\t M81.1,116.2c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C84.3,114.8,82.8,116.2,81.1,116.2z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M81.1,100.1c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8C84.9,101.9,83.2,100.1,81.1,100.1z\n\t\t\t M81.1,107.1c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C84.3,105.7,82.8,107.1,81.1,107.1z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M81.1,91.1c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S83.2,91.1,81.1,91.1z M81.1,98\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S82.8,98,81.1,98z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M90.2,154.6c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S92.3,154.6,90.2,154.6z M90.2,161.6\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C93.3,160.2,91.9,161.6,90.2,161.6z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M90.2,145.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S92.3,145.5,90.2,145.5z M90.2,152.5\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S91.9,152.5,90.2,152.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M90.2,136.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S92.3,136.5,90.2,136.5z M90.2,143.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C93.3,142,91.9,143.4,90.2,143.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M90.2,127.4c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S92.3,127.4,90.2,127.4z M90.2,134.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C93.3,133,91.9,134.4,90.2,134.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M90.2,118.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S92.3,118.3,90.2,118.3z M90.2,125.3\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S91.9,125.3,90.2,125.3z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M90.2,109.2c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C94,110.9,92.3,109.2,90.2,109.2z\n\t\t\t M90.2,116.2c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C93.3,114.8,91.9,116.2,90.2,116.2z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M90.2,100.1c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C94,101.9,92.3,100.1,90.2,100.1z\n\t\t\t M90.2,107.1c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C93.3,105.7,91.9,107.1,90.2,107.1z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M90.2,91.1c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S92.3,91.1,90.2,91.1z M90.2,98\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S91.9,98,90.2,98z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M99.3,154.6c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S101.4,154.6,99.3,154.6z M99.3,161.6\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C102.4,160.2,101,161.6,99.3,161.6z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M99.3,145.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S101.4,145.5,99.3,145.5z M99.3,152.5\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S101,152.5,99.3,152.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M99.3,136.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S101.4,136.5,99.3,136.5z M99.3,143.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C102.4,142,101,143.4,99.3,143.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M99.3,127.4c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S101.4,127.4,99.3,127.4z M99.3,134.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C102.4,133,101,134.4,99.3,134.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M99.3,118.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S101.4,118.3,99.3,118.3z M99.3,125.3\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S101,125.3,99.3,125.3z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M99.3,109.2c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C103.1,110.9,101.4,109.2,99.3,109.2z\n\t\t\t M99.3,116.2c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C102.4,114.8,101,116.2,99.3,116.2z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M99.3,100.1c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C103.1,101.9,101.4,100.1,99.3,100.1z\n\t\t\t M99.3,107.1c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C102.4,105.7,101,107.1,99.3,107.1z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M99.3,91.1c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S101.4,91.1,99.3,91.1z M99.3,98\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S101,98,99.3,98z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M108.3,154.6c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S110.5,154.6,108.3,154.6z M108.3,161.6\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C111.5,160.2,110.1,161.6,108.3,161.6z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M108.3,145.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S110.5,145.5,108.3,145.5z M108.3,152.5\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S110.1,152.5,108.3,152.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M108.3,136.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S110.5,136.5,108.3,136.5z M108.3,143.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C111.5,142,110.1,143.4,108.3,143.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M108.3,127.4c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S110.5,127.4,108.3,127.4z M108.3,134.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C111.5,133,110.1,134.4,108.3,134.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M108.3,118.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S110.5,118.3,108.3,118.3z M108.3,125.3\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S110.1,125.3,108.3,125.3z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M108.3,109.2c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8C112.2,110.9,110.5,109.2,108.3,109.2z\n\t\t\t M108.3,116.2c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C111.5,114.8,110.1,116.2,108.3,116.2z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M108.3,100.1c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8C112.2,101.9,110.5,100.1,108.3,100.1z\n\t\t\t M108.3,107.1c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C111.5,105.7,110.1,107.1,108.3,107.1z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M108.3,91.1c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S110.5,91.1,108.3,91.1z M108.3,98\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S110.1,98,108.3,98z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M117.4,154.6c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S119.5,154.6,117.4,154.6z M117.4,161.6\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C120.6,160.2,119.2,161.6,117.4,161.6z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M117.4,145.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S119.5,145.5,117.4,145.5z M117.4,152.5\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S119.2,152.5,117.4,152.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M117.4,136.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S119.5,136.5,117.4,136.5z M117.4,143.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C120.6,142,119.2,143.4,117.4,143.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M117.4,127.4c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S119.5,127.4,117.4,127.4z M117.4,134.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C120.6,133,119.2,134.4,117.4,134.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M117.4,118.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S119.5,118.3,117.4,118.3z M117.4,125.3\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S119.2,125.3,117.4,125.3z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M117.4,109.2c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C121.3,110.9,119.5,109.2,117.4,109.2z\n\t\t\t M117.4,116.2c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C120.6,114.8,119.2,116.2,117.4,116.2z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M117.4,100.1c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8C121.3,101.9,119.5,100.1,117.4,100.1z\n\t\t\t M117.4,107.1c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1C120.6,105.7,119.2,107.1,117.4,107.1z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M117.4,91.1c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8c2.1,0,3.8-1.7,3.8-3.8S119.5,91.1,117.4,91.1z M117.4,98\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1c1.7,0,3.1,1.4,3.1,3.1S119.2,98,117.4,98z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M126.5,154.6c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S128.6,154.6,126.5,154.6z M126.5,161.6\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C129.6,160.2,128.2,161.6,126.5,161.6z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M126.5,145.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S128.6,145.5,126.5,145.5z M126.5,152.5\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S128.2,152.5,126.5,152.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M126.5,136.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S128.6,136.5,126.5,136.5z M126.5,143.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C129.6,142,128.2,143.4,126.5,143.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M126.5,127.4c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S128.6,127.4,126.5,127.4z M126.5,134.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C129.6,133,128.2,134.4,126.5,134.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M126.5,118.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S128.6,118.3,126.5,118.3z M126.5,125.3\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S128.2,125.3,126.5,125.3z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M126.5,109.2c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8C130.3,110.9,128.6,109.2,126.5,109.2z\n\t\t\t M126.5,116.2c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C129.6,114.8,128.2,116.2,126.5,116.2z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M126.5,100.1c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8C130.3,101.9,128.6,100.1,126.5,100.1z\n\t\t\t M126.5,107.1c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C129.6,105.7,128.2,107.1,126.5,107.1z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M126.5,91.1c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S128.6,91.1,126.5,91.1z M126.5,98\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S128.2,98,126.5,98z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M135.6,154.6c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S137.7,154.6,135.6,154.6z M135.6,161.6\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C138.7,160.2,137.3,161.6,135.6,161.6z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M135.6,145.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S137.7,145.5,135.6,145.5z M135.6,152.5\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S137.3,152.5,135.6,152.5z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M135.6,136.5c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S137.7,136.5,135.6,136.5z M135.6,143.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C138.7,142,137.3,143.4,135.6,143.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M135.6,127.4c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S137.7,127.4,135.6,127.4z M135.6,134.4\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C138.7,133,137.3,134.4,135.6,134.4z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M135.6,118.3c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S137.7,118.3,135.6,118.3z M135.6,125.3\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S137.3,125.3,135.6,125.3z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M135.6,109.2c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8C139.4,110.9,137.7,109.2,135.6,109.2z\n\t\t\t M135.6,116.2c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C138.7,114.8,137.3,116.2,135.6,116.2z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M135.6,100.1c-2.1,0-3.8,1.7-3.8,3.8c0,2.1,1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8C139.4,101.9,137.7,100.1,135.6,100.1z\n\t\t\t M135.6,107.1c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1C138.7,105.7,137.3,107.1,135.6,107.1z',
//             },
//             children: [],
//           },
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M135.6,91.1c-2.1,0-3.8,1.7-3.8,3.8s1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8S137.7,91.1,135.6,91.1z M135.6,98\n\t\t\tc-1.7,0-3.1-1.4-3.1-3.1s1.4-3.1,3.1-3.1s3.1,1.4,3.1,3.1S137.3,98,135.6,98z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openLidLightFill',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               style: 'fill:#FFFFFF;',
//               d:
//                 'M0.7,223.9v33.7c0,2.4,1.9,4.3,4.3,4.3h162c2.4,0,4.3-1.9,4.3-4.3v-33.7',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openLidDarkFill',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               style: 'fill:#E6E6E6;',
//               d:
//                 'M166.9,257.8c0,0.2-0.2,0.4-0.4,0.4H5.5c-0.2,0-0.4-0.2-0.4-0.4v-33.9h10.1l-3.5-5.2h148.7l-3.5,5.2h10.1\n\t\t\tL166.9,257.8L166.9,257.8z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openLidOutline',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M172,223.9h-1.4v33.7c0,2-1.6,3.6-3.6,3.6H5c-2,0-3.6-1.6-3.6-3.6v-33.7H0v33.7c0,2.8,2.2,5,5,5h162c2.8,0,5-2.2,5-5\n\t\t\tL172,223.9L172,223.9z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openLidInnerWallEdges',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M167.3,223.9h-0.7v33.9c0,0,0,0.1-0.1,0.1H5.5c0,0-0.1,0-0.1-0.1v-33.9H4.7v33.9c0,0.4,0.3,0.8,0.8,0.8h161\n\t\t\tc0.4,0,0.8-0.3,0.8-0.8L167.3,223.9L167.3,223.9z M0.7,224.2h170.6v-0.7H0.7V224.2z M0.7,228.6h170.6v-0.7H0.7V228.6z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'openLidSealSkirt',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M161,218.3H11l4,5.9H157L161,218.3z M12.3,219h147.4l-3,4.5H15.3L12.3,219z M162.2,218H9.8c-0.4,0-0.7,0.3-0.7,0.7\n\t\t\ts0.3,0.7,0.7,0.7h152.4c0.4,0,0.7-0.3,0.7-0.7S162.6,218,162.2,218z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'closedLidHinge',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M140.7,203.8H31.2c-2.6,0-4.8,2.2-4.8,4.8v49.6h119.1v-49.6C145.5,206,143.3,203.8,140.7,203.8z M27.8,256.9v-48.2\n\t\t\tc0-1.9,1.5-3.4,3.4-3.4h109.4c1.9,0,3.4,1.5,3.4,3.4v48.2H27.8z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'closedInnerWallEdges',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d: 'M166.9,245.3V0.7H5.1v244.6H4.4V0h163.3v245.3H166.9z',
//             },
//             children: [],
//           },
//         ],
//       },
//       {
//         name: 'g',
//         type: 'element',
//         value: '',
//         attributes: {
//           id: 'closedChassisOutline',
//         },
//         children: [
//           {
//             name: 'path',
//             type: 'element',
//             value: '',
//             attributes: {
//               d:
//                 'M172,0H0v246h27.7v-47.9c0-3.6,2.3-6.6,5-6.6H139c2.8,0,5,3,5,6.6V246H172V0z M1.4,1.4h169.2v243.2h-25.1v-46.5\n\t\t\tc0-4.4-2.9-8-6.4-8H32.8c-3.5,0-6.4,3.6-6.4,8v46.5h-25V1.4z M0.7,53.7h170.6v-1.4H0.7V53.7z',
//             },
//             children: [],
//           },
//         ],
//       },
//     ],
//   },
// }
