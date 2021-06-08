import * as React from 'react'
import { connect } from 'react-redux'
import { Props } from '../alerts/Alerts'
import { Alerts } from '../alerts/Alerts'
import {
  actions as dismissActions,
  selectors as dismissSelectors,
} from '../../dismiss'
import { getSelectedStepId } from '../../ui/steps'
import { selectors as stepFormSelectors } from '../../step-forms'
import {
  getVisibleFormErrors,
  getVisibleFormWarnings,
  getVisibleProfileFormLevelErrors,
} from './utils'
import { Dispatch } from 'redux'
import { StepIdType } from '../../form-types'
import { StepFieldName } from '../../steplist/fieldLevel'
import { BaseState } from '../../types'

/* TODO:  BC 2018-09-13 move to src/components/alerts and adapt and use src/components/alerts/Alerts
 * see #1814 for reference
 */
type SP = {
  errors: Props['errors']
  warnings: Props['warnings']
  stepId?: StepIdType | null | undefined
}
type OP = {
  focusedField: StepFieldName | null | undefined
  dirtyFields: StepFieldName[]
}

const mapStateToProps = (state: BaseState, ownProps: OP): SP => {
  const { focusedField, dirtyFields } = ownProps
  const visibleWarnings = getVisibleFormWarnings({
    focusedField,
    dirtyFields,
    errors: dismissSelectors.getFormWarningsForSelectedStep(state),
  })
  const formLevelErrors = stepFormSelectors.getFormLevelErrorsForUnsavedForm(
    state
  )
  const visibleErrors = getVisibleFormErrors({
    focusedField,
    dirtyFields,
    errors: formLevelErrors,
  })
  // deal with special-case dynamic field form-level errors
  const { profileItemsById } = stepFormSelectors.getHydratedUnsavedForm(state)
  let visibleDynamicFieldFormErrors = []

  if (profileItemsById != null) {
    const dynamicFieldFormErrors = stepFormSelectors.getDynamicFieldFormErrorsForUnsavedForm(
      state
    )
    visibleDynamicFieldFormErrors = getVisibleProfileFormLevelErrors({
      focusedField,
      dirtyFields,
      errors: dynamicFieldFormErrors,
      profileItemsById,
    })
  }

  return {
    errors: [
      ...visibleErrors.map(error => ({
        title: error.title,
        description: error.body || null,
      })),
      ...visibleDynamicFieldFormErrors.map(error => ({
        title: error.title,
        description: error.body || null,
      })),
    ],
    warnings: visibleWarnings.map(warning => ({
      title: warning.title,
      description: warning.body || null,
      dismissId: warning.type,
    })),
    stepId: getSelectedStepId(state),
  }
}

const mergeProps = (
  stateProps: SP,
  dispatchProps: {
    dispatch: Dispatch<any>
  }
): Props => {
  const { stepId } = stateProps
  const { dispatch } = dispatchProps
  return {
    ...stateProps,
    dismissWarning: (dismissId: string) => {
      if (stepId)
        dispatch(
          dismissActions.dismissFormWarning({
            type: dismissId,
            stepId,
          })
        )
    },
  }
}

export const FormAlerts: React.AbstractComponent<OP> = connect<
  Props,
  OP,
  SP,
  {},
  _,
  _
>(
  mapStateToProps,
  null,
  mergeProps
)(Alerts)
