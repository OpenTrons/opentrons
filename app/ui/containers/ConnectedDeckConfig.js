import React from 'react'
import {connect} from 'react-redux'

import {
  selectors as robotSelectors,
  actions as robotActions
} from '../robot'
import DeckConfig from '../components/DeckConfig'

const mapStateToProps = (state) => ({
  labware: robotSelectors.getLabware(state),
  currentLabware: robotSelectors.getCurrentLabware(state),
  labwareReviewed: robotSelectors.getLabwareReviewed(state),
  tipracksConfirmed: robotSelectors.getTipracksConfirmed(state),
  labwareConfirmed: robotSelectors.getLabwareConfirmed(state),

  currentLabwareConfirmation: robotSelectors.getCurrentLabwareConfirmation(state)
})

const mapDispatchToProps = (dispatch, props) => ({
  setLabwareReviewed: () => dispatch(robotActions.setLabwareReviewed()),
  // TODO(mc, 2017-10-06): don't hardcode the pipette and pass slot in via props
  moveToContainer: (slot) => () => dispatch(robotActions.moveTo('right', slot)),
  setLabwareConfirmed: (slot) => () => dispatch(robotActions.setLabwareConfirmed(slot))
})

function ConnectedDeckConfig (props) {
  return (
    <DeckConfig {...props} />
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(ConnectedDeckConfig)
