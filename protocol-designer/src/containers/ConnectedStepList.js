// @flow
import {connect} from 'react-redux'
import type {Dispatch} from '../types'

import {selectors} from '../steplist/reducers'
import type {StepIdType} from '../steplist/types'
import {selectStep, toggleStepCollapsed} from '../steplist/actions'
import StepList from '../components/StepList'

function mapStateToProps (state) {
  return {
    steps: selectors.allSteps(state),
    selectedStepId: selectors.selectedStepId(state)
  }
}

function mapDispatchToProps (dispatch: Dispatch<*>) {
  return {
    handleStepItemClickById: (id: StepIdType) => () => dispatch(selectStep(id)),
    handleStepItemCollapseToggleById: (id: StepIdType) => () => dispatch(toggleStepCollapsed(id))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(StepList)
