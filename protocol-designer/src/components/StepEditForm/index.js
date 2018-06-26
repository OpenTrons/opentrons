// @flow
import * as React from 'react'
import {connect} from 'react-redux'
import get from 'lodash/get'
import without from 'lodash/without'
import cx from 'classnames'
import {FlatButton, PrimaryButton} from '@opentrons/components'

import {actions, selectors} from '../../steplist' // TODO use steplist/index.js
import type {StepFieldName} from '../../steplist/fieldLevel'
import type {FormData, StepType} from '../../form-types'
import type {BaseState, ThunkDispatch} from '../../types'
import formStyles from '../forms.css'
import styles from './StepEditForm.css'
import MixForm from './MixForm'
import TransferLikeForm from './TransferLikeForm'
import PauseForm from './PauseForm'

type StepForm = typeof MixForm | typeof PauseForm | typeof TransferLikeForm
const STEP_FORM_MAP: {[StepType]: StepForm} = {
  mix: MixForm,
  pause: PauseForm,
  transfer: TransferLikeForm,
  consolidate: TransferLikeForm,
  distribute: TransferLikeForm
}

export type FocusHandlers = {
  focusedField: StepFieldName,
  dirtyFields: Array<StepFieldName>,
  onFieldFocus: (StepFieldName) => void,
  onFieldBlur: (StepFieldName) => void
}

type SP = {formData?: ?FormData, canSave?: ?boolean, isNewStep?: boolean}
type DP = {
  handleChange: (accessor: string) => (event: SyntheticEvent<HTMLInputElement> | SyntheticEvent<HTMLSelectElement>) => void,
  onClickMoreOptions: (event: SyntheticEvent<>) => mixed,
  onCancel: (event: SyntheticEvent<>) => mixed,
  onSave: (event: SyntheticEvent<>) => mixed,
}
type StepEditFormState = {
  focusedField: StepFieldName | null, // TODO: BC make this a real enum of field names
  dirtyFields: Array<string> // TODO: BC make this an array of a real enum of field names
}

class StepEditForm extends React.Component<SP & DP, StepEditFormState> {
  constructor (props) {
    super(props)
    this.state = {
      focusedField: null,
      dirtyFields: [] // TODO: initialize to dirty if not new form
    }
  }

  componentDidUpdate (prevProps) {
    // NOTE: formData is sometimes undefined between steps
    if (get(this.props, 'formData.id') !== get(prevProps, 'formData.id')) {
      if (this.props.isNewStep) {
        this.setState({ focusedField: null, dirtyFields: [] })
      } else {
        const fieldNames: Array<string> = without(Object.keys(this.props.formData || {}), 'stepType', 'id')
        this.setState({ focusedField: null, dirtyFields: fieldNames })
      }
    }
  }

  onFieldFocus = (fieldName: StepFieldName) => { this.setState({focusedField: fieldName}) }

  onFieldBlur = (fieldName: StepFieldName) => {
    this.setState((prevState) => ({
      focusedField: (fieldName === prevState.focusedField) ? null : prevState.focusedField,
      dirtyFields: prevState.dirtyFields.includes(fieldName) ? prevState.dirtyFields : [...prevState.dirtyFields, fieldName]
    }))
  }

  render () {
    if (!this.props.formData) return null // early-exit if connected formData is absent
    const {formData, onClickMoreOptions, onCancel, onSave, canSave} = this.props
    const FormComponent: any = get(STEP_FORM_MAP, formData.stepType)
    if (!FormComponent) { // early-exit if step form doesn't exist
      return <div className={formStyles.form}><div>Todo: support {formData && formData.stepType} step</div></div>
    }
    return (
      <div className={cx(formStyles.form, styles[formData.stepType])}>
        { /* TODO: insert form level validation */ }
        <FormComponent
          stepType={formData.stepType}
          focusHandlers={{
            focusedField: this.state.focusedField,
            dirtyFields: this.state.dirtyFields,
            onFieldFocus: this.onFieldFocus,
            onFieldBlur: this.onFieldBlur
          }} />
        <div className={styles.button_row}>
          <FlatButton className={styles.more_options_button} onClick={onClickMoreOptions}>MORE OPTIONS</FlatButton>
          <PrimaryButton className={styles.cancel_button} onClick={onCancel}>CANCEL</PrimaryButton>
          <PrimaryButton disabled={!canSave} onClick={onSave}>SAVE</PrimaryButton>
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state: BaseState): SP => ({
  formData: selectors.formData(state),
  canSave: selectors.currentFormCanBeSaved(state),
  isNewStep: selectors.isNewStepForm(state)
})

const mapDispatchToProps = (dispatch: ThunkDispatch<*>): DP => ({
  onCancel: () => dispatch(actions.cancelStepForm()),
  onSave: () => dispatch(actions.saveStepForm()),
  onClickMoreOptions: () => dispatch(actions.openMoreOptionsModal()),
  handleChange: (accessor: string) => (e: SyntheticEvent<HTMLInputElement> | SyntheticEvent<HTMLSelectElement>) => {
    // TODO Ian 2018-01-26 factor this nasty type handling out
    const dispatchEvent = value => dispatch(actions.changeFormInput({update: {[accessor]: value}}))

    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      dispatchEvent(e.target.checked)
    } else if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
      dispatchEvent(e.target.value)
    }
  }
})

export default connect(mapStateToProps, mapDispatchToProps)(StepEditForm)
