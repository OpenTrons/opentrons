import { combineReducers } from 'redux'
import { handleActions } from 'redux-actions'
import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import type { Reducer } from 'redux'
import type { Timeline } from '@opentrons/step-generation'
import type { RobotType } from '@opentrons/shared-data'
import type { Action } from '../../types'
import type { LoadFileAction, NewProtocolFields } from '../../load-file'
import type { Substeps } from '../../steplist/types'
import type {
  ComputeRobotStateTimelineSuccessAction,
  DesignerTabPayload,
} from '../actions'
import type {
  FileMetadataFields,
  SaveFileMetadataAction,
  SelectDesignerTabAction,
} from '../types'
import { PROTOCOL_DESIGNER } from '../../constants'

export const timelineIsBeingComputed: Reducer<boolean, any> = handleActions(
  {
    COMPUTE_ROBOT_STATE_TIMELINE_REQUEST: () => true,
    COMPUTE_ROBOT_STATE_TIMELINE_SUCCESS: () => false,
  },
  false
)
// @ts-expect-error(sa, 2021-6-10): cannot use string literals as action type
// TODO IMMEDIATELY: refactor this to the old fashioned way if we cannot have type safety: https://github.com/redux-utilities/redux-actions/issues/282#issuecomment-595163081
export const computedRobotStateTimeline: Reducer<Timeline, any> = handleActions(
  {
    // @ts-expect-error(sa, 2021-6-10): cannot use string literals as action type
    COMPUTE_ROBOT_STATE_TIMELINE_SUCCESS: (
      state,
      action: ComputeRobotStateTimelineSuccessAction
    ) => action.payload.standardTimeline,
  },
  {
    timeline: [],
  }
)
export const computedSubsteps: Reducer<Substeps, any> = handleActions(
  {
    // @ts-expect-error(sa, 2021-6-10): cannot use string literals as action type
    // TODO IMMEDIATELY: refactor this to the old fashioned way if we cannot have type safety: https://github.com/redux-utilities/redux-actions/issues/282#issuecomment-595163081
    COMPUTE_ROBOT_STATE_TIMELINE_SUCCESS: (
      state,
      action: ComputeRobotStateTimelineSuccessAction
    ) => action.payload.substeps,
  },
  {}
)
const defaultFields = {
  protocolName: '',
  author: '',
  description: '',
  source: PROTOCOL_DESIGNER,
}

const updateMetadataFields = (
  state: FileMetadataFields,
  action: LoadFileAction
): FileMetadataFields => {
  const { file } = action.payload
  return file.metadata
}

// track if a protocol has been created or loaded
const currentProtocolExists = handleActions(
  {
    LOAD_FILE: () => true,
    CREATE_NEW_PROTOCOL: () => true,
  },
  false
)

function newProtocolMetadata(
  state: FileMetadataFields,
  action: {
    payload: NewProtocolFields
  }
): FileMetadataFields {
  return {
    ...defaultFields,
    protocolName: action.payload.name || '',
    description: action.payload.description || '',
    author: action.payload.organizationOrAuthor || '',
    created: Date.now(),
    lastModified: null,
  }
}
// @ts-expect-error(sa, 2021-6-10): cannot use string literals as action type
// TODO IMMEDIATELY: refactor this to the old fashioned way if we cannot have type safety: https://github.com/redux-utilities/redux-actions/issues/282#issuecomment-595163081
const fileMetadata = handleActions(
  {
    LOAD_FILE: updateMetadataFields,
    CREATE_NEW_PROTOCOL: newProtocolMetadata,
    SAVE_FILE_METADATA: (
      state: FileMetadataFields,
      action: SaveFileMetadataAction
    ): FileMetadataFields => ({ ...state, ...action.payload }),
    SAVE_PROTOCOL_FILE: (state: FileMetadataFields): FileMetadataFields => {
      // NOTE: 'last-modified' is updated "on-demand", in response to user clicking "save/export"
      return {
        ...state,
        lastModified: Date.now(),
      }
    },
  },
  defaultFields
)

// on which robot type the current protocol file is meant to execute
const robotTypeReducer = (
  state: RobotType = OT2_ROBOT_TYPE,
  action: any
): RobotType => {
  if (action.type === 'CREATE_NEW_PROTOCOL') {
    return action.payload.robotType
  } else if (action.type === 'LOAD_FILE') {
    return action.payload.file.robot.model
  }
  return state
}

const designerTabReducer = (
  state: DesignerTabPayload['tab'] = 'startingDeck',
  action: SelectDesignerTabAction
): DesignerTabPayload['tab'] => {
  if (action.type === 'SELECT_DESIGNER_TAB') {
    return action.payload.tab
  } else {
    return state
  }
}

export interface RootState {
  computedRobotStateTimeline: Timeline
  computedSubsteps: Substeps
  currentProtocolExists: boolean
  fileMetadata: FileMetadataFields
  timelineIsBeingComputed: boolean
  robotType: RobotType
  designerTab: DesignerTabPayload['tab']
}
const _allReducers = {
  computedRobotStateTimeline,
  computedSubsteps,
  currentProtocolExists,
  fileMetadata,
  timelineIsBeingComputed,
  robotType: robotTypeReducer,
  designerTab: designerTabReducer,
}
export const rootReducer: Reducer<RootState, Action> = combineReducers(
  _allReducers
)
