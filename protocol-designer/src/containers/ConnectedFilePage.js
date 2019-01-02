// @flow
import {connect} from 'react-redux'
import * as React from 'react'
import mapValues from 'lodash/mapValues'
import type {BaseState} from '../types'
import FilePage from '../components/FilePage'
import {actions, selectors as fileSelectors} from '../file-data'
import {selectors as stepFormSelectors} from '../step-forms'
import {actions as steplistActions} from '../steplist'
import {INITIAL_DECK_SETUP_STEP_ID} from '../constants'
import type {InitialDeckSetup} from '../step-forms'
import type {FileMetadataFields} from '../file-data'
import {actions as navActions} from '../navigation'

type Props = React.ElementProps<typeof FilePage>

type SP = {
  instruments: $PropertyType<Props, 'instruments'>,
  formValues: $PropertyType<Props, 'formValues'>,
  _initialDeckSetup: InitialDeckSetup,
}

const mapStateToProps = (state: BaseState): SP => {
  return {
    formValues: fileSelectors.getFileMetadata(state),
    instruments: stepFormSelectors.getPipettesForInstrumentGroup(state),
    _initialDeckSetup: stepFormSelectors.getInitialDeckSetup(state),
  }
}

function mergeProps (stateProps: SP, dispatchProps: {dispatch: Dispatch<*>}): Props {
  const {_initialDeckSetup, ...passThruProps} = stateProps
  const {dispatch} = dispatchProps
  const swapPipetteUpdate = mapValues(_initialDeckSetup.pipettes, (pipette) => {
    if (!pipette.mount) return pipette.mount
    return pipette.mount === 'left' ? 'right' : 'left'
  })

  return {
    ...passThruProps,
    ...dispatchProps,
    goToNextPage: () => dispatch(navActions.navigateToPage('liquids')),
    saveFileMetadata: (nextFormValues: FileMetadataFields) =>
      dispatch(actions.saveFileMetadata(nextFormValues)),
    swapPipettes: () =>
      dispatch(steplistActions.changeSavedStepForm({
        stepId: INITIAL_DECK_SETUP_STEP_ID,
        update: {pipetteLocationUpdate: swapPipetteUpdate},
      })),
  }
}

export default connect(mapStateToProps, null, mergeProps)(FilePage)
