// Named arguments to createFile selector. This data would be the result of several selectors.
import type { RobotState, Timeline } from '@opentrons/step-generation'
import type { SavedStepFormState, ModuleEntities } from '../../../step-forms'
import type { StepIdType } from '../../../form-types'
export const initialRobotState: RobotState = {
  labware: {
    fixedTrash: {
      slot: '12',
    },
    tiprackId: {
      slot: '2',
    },
    plateId: {
      slot: 'magneticModuleId',
    },
  },
  modules: {
    magneticModuleId: {
      slot: '1',
      moduleState: {
        type: 'magneticModuleType',
        engaged: true,
      },
    },
  },
  pipettes: {
    pipetteId: {
      mount: 'left',
    },
  },
  liquidState: {
    labware: {},
    pipettes: {},
    additionalEquipment: {},
  },
  tipState: {
    tipracks: {},
    pipettes: {},
  },
}
export const robotStateTimeline: Timeline = {
  timeline: [
    {
      commands: [
        {
          commandType: 'magneticModule/engage',
          params: {
            moduleId: 'magneticModuleId',
            height: 16,
          },
        },
      ],
      robotState: initialRobotState,
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
      plateId: 'magneticModuleId',
    },
    pipetteLocationUpdate: {
      pipetteId: 'left',
    },
    moduleLocationUpdate: {
      magneticModuleId: '1',
    },
  },
  engageMagnetStepId: {
    id: 'engageMagnetStepId',
    stepType: 'magnet',
    stepName: 'magnet',
    stepDetails: '',
    moduleId: 'magneticModuleId',
    magnetAction: 'engage',
    engageHeight: '16',
  },
}
export const orderedStepIds: StepIdType[] = ['engageMagnetStepId']
export const moduleEntities: ModuleEntities = {
  magneticModuleId: {
    id: 'magneticModuleId',
    type: 'magneticModuleType',
    model: 'magneticModuleV1',
    pythonName: 'mockPythonName',
  },
}
