// @flow
import * as React from 'react'
import type {Dispatch} from 'redux'
import {connect} from 'react-redux'
import {
  actions as dismissActions,
  selectors as dismissSelectors
} from '../dismiss'
import {selectors as steplistSelectors} from '../steplist'
import {selectors as fileDataSelectors} from '../file-data'
import {AlertItem} from '@opentrons/components'
import type {BaseState} from '../types'
import type {CommandCreatorError, CommandCreatorWarning} from '../step-generation'

type SP = {
  errors: Array<CommandCreatorError>,
  warnings: Array<CommandCreatorWarning>,
  _stepId: *
}

type DP = {
  onDismiss: (*) => () => mixed // TODO TYPE THIS
}

type Props = SP & DP

// These captions populate the AlertItem body, the title/message
// comes from the CommandCreatorError / CommandCreatorWarning
const captions: {[warningOrErrorType: string]: string} = {
  'INSUFFICIENT_TIPS': 'Add another tip rack to an empty slot in Deck Setup',
  'ASPIRATE_MORE_THAN_WELL_CONTENTS': 'You are trying to aspirate more than the current volume of one of your well(s). If you intended to add air to your tip, please use the Air Gap advanced setting.'
}

function Alerts (props: Props) {
  const alertItemHelper = (alert: CommandCreatorError | CommandCreatorWarning, key) => (
    <AlertItem
      type='warning'
      key={key}
      title={alert.message}
      onCloseClick={alert.isDismissable
        ? props.onDismiss(alert)
        : undefined
      }
      >
        {captions[alert.type]}
      </AlertItem>
  )
  return (
    <div>
      {props.errors.map(alertItemHelper)}
      {props.warnings.map(alertItemHelper)}
    </div>
  )
}

function mapStateToProps (state: BaseState): SP {
  const timeline = fileDataSelectors.robotStateTimeline(state)
  const errors = timeline.errors || []
  const warnings = dismissSelectors.getWarningsForSelectedStep(state)
  const _stepId: any = steplistSelectors.selectedStepId(state)

  return {
    errors,
    warnings,
    _stepId
  }
}

function mergeProps (stateProps: SP, dispatchProps: {dispatch: Dispatch<*>}): Props {
  const {dispatch} = dispatchProps
  const onDismiss = (warning: CommandCreatorWarning) =>
    () =>
      dispatch(dismissActions.dismissWarning({
        warning,
        stepId: stateProps._stepId
      }))

  return {
    ...stateProps,
    onDismiss
  }
}

export default connect(mapStateToProps, null, mergeProps)(Alerts)
