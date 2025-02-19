// Named arguments to createFile selector. This data would be the result of several selectors.
import type { RobotState, Timeline } from '@opentrons/step-generation'
import type {
  SavedStepFormState,
  ModuleEntities,
} from '/protocol-designer/step-forms'
import type { StepIdType } from '/protocol-designer/form-types'
export const initialRobotState: RobotState = {
  labware: {
    fixedTrash: {
      slot: '12',
    },
    tiprackId: {
      slot: '2',
    },
    plateId: {
      slot: '1',
    },
  },
  modules: {},
  pipettes: {
    pipetteId: {
      mount: 'left',
    },
  },
  liquidState: {
    pipettes: {},
    labware: {},
    additionalEquipment: {},
  },
  tipState: {
    pipettes: {},
    tipracks: {},
  },
}
export const robotStateTimeline: Timeline = {
  timeline: [
    {
      commands: [
        {
          commandType: 'pickUpTip',
          params: {
            pipetteId: 'pipetteId',
            labwareId: 'tiprackId',
            wellName: 'A1',
          },
        },
        {
          commandType: 'aspirate',
          params: {
            pipetteId: 'pipetteId',
            volume: 6,
            labwareId: 'plateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 1,
              },
            },
            flowRate: 3.78,
          },
        },
        {
          commandType: 'dispense',
          params: {
            pipetteId: 'pipetteId',
            volume: 6,
            labwareId: 'fixedTrash',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 0.5,
              },
            },
            flowRate: 3.78,
          },
        },
        {
          commandType: 'dropTip',
          params: {
            pipetteId: 'pipetteId',
            labwareId: 'fixedTrash',
            wellName: 'A1',
          },
        },
        {
          commandType: 'pickUpTip',
          params: {
            pipetteId: 'pipetteId',
            labwareId: 'tiprackId',
            wellName: 'B1',
          },
        },
        {
          commandType: 'aspirate',
          params: {
            pipetteId: 'pipetteId',
            volume: 6,
            labwareId: 'plateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 1,
              },
            },
            flowRate: 3.78,
          },
        },
        {
          commandType: 'dispense',
          params: {
            pipetteId: 'pipetteId',
            volume: 6,
            labwareId: 'fixedTrash',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 0.5,
              },
            },
            flowRate: 3.78,
          },
        },
        {
          commandType: 'dropTip',
          params: {
            pipetteId: 'pipetteId',
            labwareId: 'fixedTrash',
            wellName: 'A1',
          },
        },
      ],
      robotState: initialRobotState,
      warnings: [],
    },
  ],
  errors: null,
}
export const savedStepForms: SavedStepFormState = {
  __INITIAL_DECK_SETUP_STEP__: {
    stepType: 'manualIntervention',
    id: '__INITIAL_DECK_SETUP_STEP__',
    labwareLocationUpdate: {
      fixedTrash: '12',
      tiprackId: '2',
      plateId: '1',
    },
    pipetteLocationUpdate: {
      pipetteId: 'left',
    },
    moduleLocationUpdate: {},
  },
  moveLiquidStepId: {
    id: 'moveLiquidStepId',
    stepType: 'moveLiquid',
    stepName: 'transfer',
    stepDetails: '',
    pipetteId: 'pipetteId',
    volume: '6',
    changeTip: 'always',
    path: 'single',
    aspirate_wells_grouped: false,
    aspirate_flowRate: null,
    aspirate_labwareId: 'plateId',
    aspirate_wells: ['A1', 'B1'],
    aspirate_wellOrder_first: 't2b',
    aspirate_wellOrder_second: 'l2r',
    aspirate_mix_checkbox: false,
    aspirate_mix_times: null,
    aspirate_mix_volume: null,
    aspirate_mmFromBottom: 1,
    aspirate_touchTip_checkbox: false,
    dispense_flowRate: null,
    dispense_labwareId: 'fixedTrash',
    dispense_wells: ['A1'],
    dispense_wellOrder_first: 't2b',
    dispense_wellOrder_second: 'l2r',
    dispense_mix_checkbox: false,
    dispense_mix_times: null,
    dispense_mix_volume: null,
    dispense_mmFromBottom: 0.5,
    dispense_touchTip_checkbox: false,
    disposalVolume_checkbox: true,
    disposalVolume_volume: '1',
    blowout_checkbox: false,
    blowout_location: 'fixedTrash',
    preWetTip: false,
  },
}
export const orderedStepIds: StepIdType[] = ['moveLiquidStepId']
export const moduleEntities: ModuleEntities = {}
