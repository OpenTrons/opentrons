// @flow
import assert from 'assert'
import { uuid } from '../../utils'
import { selectors as stepFormSelectors } from '../../step-forms'
import { selectors as uiLabwareSelectors } from '../../ui/labware'
import type {
  CreateContainerArgs,
  CreateContainerAction,
  DuplicateLabwareAction,
} from './actions'
import type { GetState, ThunkDispatch } from '../../types'
import { getNextAvailableDeckSlot, getNextNickname } from '../utils'

export const createContainer = (args: CreateContainerArgs) => (
  dispatch: ThunkDispatch<CreateContainerAction>,
  getState: GetState
) => {
  const state = getState()
  const initialDeckSetup = stepFormSelectors.getInitialDeckSetup(state)
  const slot = args.slot || getNextAvailableDeckSlot(initialDeckSetup)
  if (slot) {
    dispatch({
      type: 'CREATE_CONTAINER',
      payload: {
        ...args,
        id: `${uuid()}:${args.labwareDefURI}`,
        slot,
      },
    })
  } else {
    console.warn('no slots available, cannot create labware')
  }
}

export const duplicateLabware = (templateLabwareId: string) => (
  dispatch: ThunkDispatch<DuplicateLabwareAction>,
  getState: GetState
) => {
  const state = getState()
  const templateLabwareDefURI = stepFormSelectors.getLabwareEntities(state)[
    templateLabwareId
  ].labwareDefURI
  assert(
    templateLabwareDefURI,
    `no labwareDefURI for labware ${templateLabwareId}, cannot run duplicateLabware thunk`
  )

  const initialDeckSetup = stepFormSelectors.getInitialDeckSetup(state)
  const duplicateSlot = getNextAvailableDeckSlot(initialDeckSetup)

  if (!duplicateSlot)
    console.warn('no slots available, cannot duplicate labware')

  const allNicknamesById = uiLabwareSelectors.getLabwareNicknamesById(state)
  const templateNickname = allNicknamesById[templateLabwareId]
  const duplicateLabwareNickname = getNextNickname(
    Object.keys(allNicknamesById).map((id: string) => allNicknamesById[id]), // NOTE: flow won't do Object.values here >:(
    templateNickname
  )

  if (templateLabwareDefURI && duplicateSlot) {
    dispatch({
      type: 'DUPLICATE_LABWARE',
      payload: {
        duplicateLabwareNickname,
        templateLabwareId,
        duplicateLabwareId: uuid(),
        slot: duplicateSlot,
      },
    })
  }
}

export type RenameLabwareAction = {
  type: 'RENAME_LABWARE',
  payload: {
    labwareId: string,
    name?: ?string,
  },
}

export const renameLabware = (
  args: $PropertyType<RenameLabwareAction, 'payload'>
) => (dispatch: ThunkDispatch<RenameLabwareAction>, getState: GetState) => {
  const { labwareId } = args
  const state = getState()

  const allNicknamesById = uiLabwareSelectors.getLabwareNicknamesById(state)
  const defaultNickname = allNicknamesById[labwareId]
  const nextNickname = getNextNickname(
    Object.keys(allNicknamesById)
      .filter((id: string) => id !== labwareId)
      .map((id: string) => allNicknamesById[id]), // NOTE: flow won't do Object.values here >:(
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
