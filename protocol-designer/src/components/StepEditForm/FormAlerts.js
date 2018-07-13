// @flow
import * as React from 'react'
import type {Dispatch} from 'redux'
import {connect} from 'react-redux'
import difference from 'lodash/difference'
import {AlertItem} from '@opentrons/components'
import type {StepIdType} from '../../form-types'
import {selectors as steplistSelectors} from '../../steplist'
import {END_STEP} from '../../steplist/types'
import {type StepFieldName} from '../../steplist/fieldLevel'
import type {FormError, FormWarning} from '../../steplist/formLevel'
import type {BaseState} from '../../types'

type MaybeStepId = ?StepIdType | typeof END_STEP
type SP = {
  errors: Array<FormError>,
  warnings: Array<FormWarning>,
  stepId: MaybeStepId
}
type DP = {dismissWarning: (FormWarning, MaybeStepId) => void}
type OP = {focusedField: ?StepFieldName, dirtyFields: Array<StepFieldName>}
type FormAlertsProps = SP & DP

class FormAlerts extends React.Component<FormAlertsProps> {
  makeHandleCloseWarning = (warning: FormWarning) => () => {
    this.props.dismissWarning(warning, this.props.stepId)
  }

  render () {
    return (
      <React.Fragment>
        {this.props.errors.map((error, index) => (
          <AlertItem
            type="warning"
            key={index}
            title={error.title || error.message}>
            {error.title ? error.message : null}
          </AlertItem>
        ))}
        {this.props.warnings.map((warning, index) => (
          <AlertItem
            type="warning"
            key={index}
            title={warning.title || warning.message}
            onCloseClick={this.makeHandleCloseWarning(warning)}>
            {warning.title ? warning.message : null}
          </AlertItem>
        ))}
      </React.Fragment>
    )
  }
}

const mapStateToProps = (state: BaseState, ownProps: OP): SP => {
  const errors = steplistSelectors.formLevelErrors(state)
  const warnings = (process.env.OT_PD_SHOW_WARNINGS === 'true') ? steplistSelectors.formLevelWarnings(state) : []

  const {focusedField, dirtyFields} = ownProps
  const filteredErrors = errors.filter(e => (
    !e.dependentFields.includes(focusedField) && difference(e.dependentFields, dirtyFields).length === 0)
  )
  const filteredWarnings = warnings.filter(w => (
    !w.dependentFields.includes(focusedField) && difference(w.dependentFields, dirtyFields).length === 0)
  )
  return {errors: filteredErrors, warnings: filteredWarnings, stepId: steplistSelectors.selectedStepId(state)}
}

const mapDispatchToProps = (dispatch: Dispatch<*>): DP => ({
  dismissWarning: (warning: FormWarning, stepId: MaybeStepId) => {
    console.log('dismiss warning here', warning, stepId)
    // TODO: BC 2018-07-09 un-comment after Ian's dismiss reducer is merged
    //   dispatch(dismissActions.dismissWarning({warning, stepId}))
  }
})

export default connect(mapStateToProps, mapDispatchToProps)(FormAlerts)
