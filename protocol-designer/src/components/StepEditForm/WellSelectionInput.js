// @flow
import * as React from 'react'
import {connect} from 'react-redux'
import {FormGroup, InputField} from '@opentrons/components'
import {selectors as steplistSelectors} from '../../steplist'
import {getFieldErrors, type StepFieldName} from '../../steplist/fieldLevel'
import {openWellSelectionModal, type OpenWellSelectionModalPayload} from '../../well-selection/actions'
import type {BaseState, ThunkDispatch} from '../../types'
import styles from './StepEditForm.css'
import {showFieldErrors} from './StepFormField'
import type {FocusHandlers} from './index'

// TODO Ian 2018-04-27 use selector to get num wells * 8 if multi-channel
// TODO: move this function to helpers and correct pipette typing add in selectedPipette multiplier
const formatWellCount = (wells: Array<string>, selectedPipette: any) => {
  return wells ? wells.length : 0
}

type WellSelectionInputOP = {
  name: StepFieldName,
  pipetteFieldName: StepFieldName,
  labwareFieldName: StepFieldName
} & FocusHandlers
type WellSelectionInputSP = {
  _selectedPipetteId?: ?string,
  _selectedLabwareId?: ?string,
  _wellFieldErrors: Array<string>,
  wellCount: number
}
type WellSelectionInputDP = {_openWellSelectionModal: (OpenWellSelectionModalPayload) => void}
type WellSelectionInputProps = {
  wellCount?: number,
  disabled: boolean,
  onClick?: (e: SyntheticMouseEvent<*>) => mixed,
  errorToShow: ?string
}

const WellSelectionInput = (props: WellSelectionInputProps) => (
  <FormGroup label='Wells:' disabled={props.disabled} className={styles.well_selection_input}>
    <InputField
      readOnly
      value={props.wellCount ? String(props.wellCount) : null}
      onClick={props.onClick}
      error={props.errorToShow} />
  </FormGroup>
)

const WellSelectionInputSTP = (state: BaseState, ownProps: WellSelectionInputOP): WellSelectionInputSP => {
  const formData = steplistSelectors.getUnsavedForm(state)
  const selectedPipette = formData && formData[ownProps.pipetteFieldName]
  const selectedWells = formData ? formData[ownProps.name] : []
  return {
    _selectedPipetteId: selectedPipette,
    _selectedLabwareId: formData && formData[ownProps.labwareFieldName],
    _wellFieldErrors: getFieldErrors(ownProps.name, selectedWells) || [],
    wellCount: formatWellCount(selectedWells, selectedPipette)
  }
}
const WellSelectionInputDTP = (dispatch: ThunkDispatch<*>): WellSelectionInputDP => ({
  _openWellSelectionModal: (payload) => { dispatch(openWellSelectionModal(payload)) }
})
const WellSelectionInputMP = (
  stateProps: WellSelectionInputSP,
  dispatchProps: WellSelectionInputDP,
  ownProps: WellSelectionInputOP
): WellSelectionInputProps => {
  const {_selectedPipetteId, _selectedLabwareId, _wellFieldErrors} = stateProps
  const disabled = _selectedLabwareId === 'trashId' || !(_selectedPipetteId && _selectedLabwareId)
  const {name, focusedField, dirtyFields} = ownProps
  const showErrors = showFieldErrors({name, focusedField, dirtyFields})
  return {
    disabled,
    wellCount: stateProps.wellCount,
    errorToShow: showErrors ? _wellFieldErrors[0] : null,
    onClick: () => {
      if (ownProps.onFieldBlur) {
        ownProps.onFieldBlur(ownProps.name)
      }
      if (_selectedPipetteId && _selectedLabwareId) {
        dispatchProps._openWellSelectionModal({
          pipetteId: _selectedPipetteId,
          labwareId: _selectedLabwareId,
          formFieldAccessor: ownProps.name
        })
      }
    }
  }
}

const connectWellSelectionInput = connect(WellSelectionInputSTP, WellSelectionInputDTP, WellSelectionInputMP)
const ConnectedWellSelectionInput = connectWellSelectionInput(WellSelectionInput)

export default ConnectedWellSelectionInput
