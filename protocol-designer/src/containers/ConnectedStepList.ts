import { $Diff } from 'utility-types'
import * as React from 'react'
import { connect } from 'react-redux'
import { BaseState, ThunkDispatch } from '../types'
import { StepIdType } from '../form-types'
import { actions as steplistActions } from '../steplist'
import { actions as stepsActions, getIsMultiSelectMode } from '../ui/steps'
import { selectors as stepFormSelectors } from '../step-forms'
import { StepList } from '../components/steplist'
type Props = React.ComponentProps<typeof StepList>
type SP = {
  orderedStepIds: Props['orderedStepIds']
  isMultiSelectMode: boolean | null | undefined
}
type DP = $Diff<Props, SP>

function mapStateToProps(state: BaseState): SP {
  return {
    orderedStepIds: stepFormSelectors.getOrderedStepIds(state),
    isMultiSelectMode: getIsMultiSelectMode(state),
  }
}

function mapDispatchToProps(dispatch: ThunkDispatch<any>): DP {
  return {
    reorderSelectedStep: (delta: number) => {
      dispatch(stepsActions.reorderSelectedStep(delta))
    },
    reorderSteps: (stepIds: StepIdType[]) => {
      dispatch(steplistActions.reorderSteps(stepIds))
    },
  }
}

export const ConnectedStepList: React.AbstractComponent<{}> = connect<
  Props,
  {},
  SP,
  DP,
  _,
  _
>(
  mapStateToProps,
  mapDispatchToProps
)(StepList)
