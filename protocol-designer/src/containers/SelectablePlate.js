// @flow
import * as React from 'react'
import {connect} from 'react-redux'
import type {Dispatch} from 'redux'
import SelectablePlate from '../components/SelectablePlate.js'
import { selectors } from '../labware-ingred/reducers'
import {selectors as steplistSelectors} from '../steplist/reducers'
import {selectors as fileSelectors} from '../file-data'
import { preselectWells, selectWells } from '../labware-ingred/actions'
import type {BaseState} from '../types'

type OwnProps = {
  containerId?: string,
  selectable?: boolean,
  cssFillParent?: boolean
}

type Props = React.ElementProps<typeof SelectablePlate>

type DispatchProps = {
  onSelectionMove: $PropertyType<Props, 'onSelectionMove'>,
  onSelectionDone: $PropertyType<Props, 'onSelectionDone'>
}

type StateProps = $Diff<Props, DispatchProps>

function mapStateToProps (state: BaseState, ownProps: OwnProps): StateProps {
  const selectedContainer = selectors.selectedContainer(state)
  const selectedContainerId = selectedContainer && selectedContainer.containerId
  const containerId = ownProps.containerId || selectedContainerId

  if (containerId === null) {
    throw new Error('SelectablePlate: No container is selected, and no containerId was given to Connected SelectablePlate')
  }

  const labware = selectors.getLabware(state)[containerId]
  const stepId = steplistSelectors.hoveredOrSelectedStepId(state)
  const prevStepId = stepId === null ? 0 : Math.max(stepId - 1, 0)
  const allWellContentsForSteps = fileSelectors.allWellContentsForSteps(state)

  const wellContents = allWellContentsForSteps[prevStepId]
    ? allWellContentsForSteps[prevStepId][containerId]
    : {}

  return {
    containerId,
    // wellContents: selectors.wellContentsAllLabware(state)[containerId], // TODO Ian 2018-03-19 don't need this selector anymore? Remove
    wellContents,
    containerType: labware.type,
    selectable: ownProps.selectable
  }
}

function mapDispatchToProps (dispatch: Dispatch<*>): DispatchProps {
  return {
    onSelectionMove: (e, rect) => dispatch(preselectWells(e, rect)),
    onSelectionDone: (e, rect) => dispatch(selectWells(e, rect))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectablePlate)
