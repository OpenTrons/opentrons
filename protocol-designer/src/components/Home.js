import React from 'react'
import { connect } from 'react-redux'

import {closeIngredientSelector} from '../labware-ingred/actions'

import { selectors } from '../labware-ingred/reducers'
import {Deck} from '@opentrons/components'
import LabwareContainer from '../containers/LabwareContainer.js'
import IngredientSelectionModal from '../components/IngredientSelectionModal.js'
import LabwareDropdown from '../containers/LabwareDropdown.js'

const ingredSelModIsVisible = activeModals => activeModals.ingredientSelection && activeModals.ingredientSelection.slotName

// TODO Ian 2017-12-04 make proper component
const ConnectedIngredSelModal = connect(
  state => ({
    visible: ingredSelModIsVisible(selectors.activeModals(state))
  }),
  {
    onClose: closeIngredientSelector
  }
)(IngredientSelectionModal)

export default function Home () {
  return (
    <div>
      <LabwareDropdown />
      <ConnectedIngredSelModal />
      <Deck LabwareComponent={LabwareContainer} />
      <h2>Select labware you wish to add ingredients to</h2>
    </div>
  )
}
