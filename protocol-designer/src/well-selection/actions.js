// @flow
import {createAction} from 'redux-actions'
import selectors from './selectors'
import {changeFormInput} from '../steplist/actions'
import {selectors as steplistSelectors} from '../steplist/reducers'

import type {Channels} from '@opentrons/components'
import type {ThunkDispatch, GetState} from '../types'
import type {Wells} from '../labware-ingred/types'

// ===== Preselect / select wells in plate

export type WellSelectionPayload = {|
  wells: Wells,
  labwareType: string,
  pipetteChannels: Channels
|}

const _wellSelectPayloadMapper = (
  args: WellSelectionPayload
): WellSelectionPayload => args

export const highlightWells = createAction(
  'HIGHLIGHT_WELLS',
  _wellSelectPayloadMapper
)

export const selectWells = createAction(
  'SELECT_WELLS',
  _wellSelectPayloadMapper
)

export const deselectWells = createAction(
  'DESELECT_WELLS',
  _wellSelectPayloadMapper
)

// Well selection modal
export type OpenWellSelectionModalPayload = {
  labwareId: string,
  pipetteId: string,
  formFieldAccessor: string // eg 'aspirate--wells' or 'dispense--wells'
}

function _wellArrayToObj (wells: ?Array<string>): Wells {
  if (!wells) {
    return {}
  }
  return wells.reduce((acc: Wells, well: string) => ({
    ...acc,
    [well]: well
  }), {})
}

export const openWellSelectionModal = (payload: OpenWellSelectionModalPayload) =>
  (dispatch: ThunkDispatch<*>, getState: GetState) => {
    const state = getState()
    const accessor = payload.formFieldAccessor
    const formData = steplistSelectors.formData(state)

    const wells: Wells = (accessor && formData && formData[accessor] &&
      _wellArrayToObj(formData[accessor])) || {}

    // initially selected wells in form get selected in state before modal opens
    dispatch({
      type: 'SELECT_WELLS',
      payload: {
        wells,
        append: false
      }
    })

    dispatch({
      type: 'OPEN_WELL_SELECTION_MODAL',
      payload
    })
  }

export const closeWellSelectionModal = (): * => ({
  type: 'CLOSE_WELL_SELECTION_MODAL',
  payload: null
})

export const saveWellSelectionModal = () =>
  (dispatch: ThunkDispatch<*>, getState: GetState) => {
    const state = getState()
    const wellSelectionModalData = selectors.wellSelectionModalData(state)

    // this if-else is mostly for Flow
    if (wellSelectionModalData) {
      dispatch(changeFormInput({
        accessor: wellSelectionModalData.formFieldAccessor,
        value: selectors.selectedWellNames(state)
      }))
    } else {
      console.warn('No well selection modal data in state')
    }

    dispatch(closeWellSelectionModal())
  }
