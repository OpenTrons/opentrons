import assert from 'assert'
import { getIsTiprack } from '@opentrons/shared-data'
import { uuid } from '../../utils'
import { selectors as labwareDefSelectors } from '../../labware-defs'
import { selectors as stepFormSelectors } from '../../step-forms'
import { selectors as uiLabwareSelectors } from '../../ui/labware'
import { getNextAvailableDeckSlot, getNextNickname } from '../utils'
import {
  CreateContainerArgs,
  CreateContainerAction,
  DuplicateLabwareAction,
} from './actions'
import { ThunkAction } from '../../types'
import { getRobotType } from '../../file-data/selectors'
export interface RenameLabwareAction {
  type: 'RENAME_LABWARE'
  payload: {
    labwareId: string
    name?: string | null
  }
}
export const renameLabware: (
  args: RenameLabwareAction['payload']
) => ThunkAction<CreateContainerAction | RenameLabwareAction> = args => (
  dispatch,
  getState
) => {
  const { labwareId } = args
  const allNicknamesById = uiLabwareSelectors.getLabwareNicknamesById(
    getState()
  )
  const defaultNickname = allNicknamesById[labwareId]
  const nextNickname = getNextNickname(
    // NOTE: flow won't do Object.values here >:(
    Object.keys(allNicknamesById)
      .filter((id: string) => id !== labwareId) // <- exclude the about-to-be-renamed labware from the nickname list
      .map((id: string) => allNicknamesById[id]),
    args.name || defaultNickname
  )
  return dispatch({
    type: 'RENAME_LABWARE',
    payload: {
      labwareId,
      name: nextNickname,
    },
  })
}
export const createContainer: (
  args: CreateContainerArgs
) => ThunkAction<CreateContainerAction | RenameLabwareAction> = args => (
  dispatch,
  getState
) => {
  const state = getState()
  const initialDeckSetup = stepFormSelectors.getInitialDeckSetup(state)
  const robotType = getRobotType(state)
  const slot =
    args.slot || getNextAvailableDeckSlot(initialDeckSetup, robotType)
  const labwareDef = labwareDefSelectors.getLabwareDefsByURI(state)[
    args.labwareDefURI
  ]
  const isTiprack = getIsTiprack(labwareDef)

  if (slot) {
    const id = `${uuid()}:${args.labwareDefURI}`
    const adapterId =
      args.adapterUnderLabwareDefURI != null
        ? `${uuid()}:${args.adapterUnderLabwareDefURI}`
        : null

    if (adapterId != null && args.adapterUnderLabwareDefURI != null) {
      dispatch({
        type: 'CREATE_CONTAINER',
        payload: {
          ...args,
          labwareDefURI: args.adapterUnderLabwareDefURI,
          id: adapterId,
          slot,
        },
      })
      dispatch({
        type: 'CREATE_CONTAINER',
        payload: {
          ...args,
          id,
          slot: adapterId,
        },
      })
    } else {
      dispatch({
        type: 'CREATE_CONTAINER',
        payload: { ...args, id, slot },
      })
    }
    if (isTiprack) {
      // Tipracks cannot be named, but should auto-increment.
      // We can't rely on reducers to do that themselves bc they don't have access
      // to both the nickname state and the isTiprack condition
      renameLabware({
        labwareId: id,
      })(dispatch, getState)
    }
  } else {
    console.warn('no slots available, cannot create labware')
  }
}

interface DuplicateArgs {
  templateLabwareId: string
  templateAdapterId?: string
}
export const duplicateLabware: (
  args: DuplicateArgs
) => ThunkAction<DuplicateLabwareAction> = args => (dispatch, getState) => {
  const { templateLabwareId, templateAdapterId } = args
  const state = getState()
  const robotType = state.fileData.robotType
  const templateLabwareDefURI = stepFormSelectors.getLabwareEntities(state)[
    templateLabwareId
  ].labwareDefURI
  const tempAdapterEntity =
    templateAdapterId != null
      ? stepFormSelectors.getLabwareEntities(state)[templateAdapterId]
      : null
  const templateAdapterDefURI = tempAdapterEntity?.labwareDefURI ?? null
  const templateAdapterDisplayName =
    tempAdapterEntity?.def.metadata.displayName ?? null

  assert(
    templateLabwareDefURI,
    `no labwareDefURI for labware ${templateLabwareId}, cannot run duplicateLabware thunk`
  )

  const initialDeckSetup = stepFormSelectors.getInitialDeckSetup(state)
  const templateLabwareIdIsOffDeck =
    initialDeckSetup.labware[templateLabwareId].slot === 'offDeck'
  const duplicateSlot = getNextAvailableDeckSlot(initialDeckSetup, robotType)
  if (!duplicateSlot)
    console.warn('no slots available, cannot duplicate labware')
  const allNicknamesById = uiLabwareSelectors.getLabwareNicknamesById(state)
  const templateNickname = allNicknamesById[templateLabwareId]
  const duplicateLabwareNickname = getNextNickname(
    Object.keys(allNicknamesById).map((id: string) => allNicknamesById[id]), // NOTE: flow won't do Object.values here >:(
    templateNickname
  )

  if (templateLabwareDefURI && duplicateSlot) {
    if (templateAdapterDefURI != null && templateAdapterId != null) {
      dispatch({
        type: 'DUPLICATE_LABWARE',
        payload: {
          //  you can't set a nick name for adapters
          duplicateLabwareNickname: templateAdapterDisplayName ?? '',
          templateLabwareId: templateAdapterId,
          duplicateLabwareId: uuid() + ':' + templateAdapterDefURI,
          slot: duplicateSlot,
        },
      })
      dispatch({
        type: 'DUPLICATE_LABWARE',
        payload: {
          duplicateLabwareNickname,
          templateLabwareId,
          duplicateLabwareId: uuid() + ':' + templateLabwareDefURI,
          slot: templateAdapterId,
        },
      })
    }
    dispatch({
      type: 'DUPLICATE_LABWARE',
      payload: {
        duplicateLabwareNickname,
        templateLabwareId,
        duplicateLabwareId: uuid() + ':' + templateLabwareDefURI,
        slot: templateLabwareIdIsOffDeck ? 'offDeck' : duplicateSlot,
      },
    })
  }
}
