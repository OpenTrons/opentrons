// @flow
import * as React from 'react'
import { connect } from 'react-redux'
import { LabwareRender, type WellGroup } from '@opentrons/components'

import * as wellContentsSelectors from '../../top-selectors/well-contents'
import * as highlightSelectors from '../../top-selectors/substep-highlight'
import * as tipContentsSelectors from '../../top-selectors/tip-contents'
import { type LabwareOnDeck as LabwareOnDeckType } from '../../step-forms'
import type { ContentsByWell } from '../../labware-ingred/types'
import type { BaseState } from '../../types'
import { wellFillFromWellContents } from '../labware/utils'

type OP = {|
  labwareOnDeck: LabwareOnDeckType,
  x: number,
  y: number,
|}

type SP = {|
  wellContents: ContentsByWell,
  missingTips: WellGroup,
  highlightedWells: WellGroup,
|}

type Props = { ...OP, ...SP }

const LabwareOnDeck = (props: Props) => (
  <g transform={`translate(${props.x}, ${props.y})`}>
    <LabwareRender
      definition={props.labwareOnDeck.def}
      wellFill={wellFillFromWellContents(props.wellContents)}
      highlightedWells={props.highlightedWells}
      missingTips={props.missingTips}
    />
  </g>
)

const mapStateToProps = (state: BaseState, ownProps: OP): SP => {
  const { labwareOnDeck } = ownProps

  return {
    wellContents: wellContentsSelectors.getAllWellContentsForActiveItem(state)[
      labwareOnDeck.id
    ],
    highlightedWells: highlightSelectors.wellHighlightsByLabwareId(state)[
      labwareOnDeck.id
    ],
    missingTips: tipContentsSelectors.getMissingTipsByLabwareId(state)[
      labwareOnDeck.id
    ],
  }
}

export default connect<Props, OP, SP, {||}, _, _>(mapStateToProps)(
  LabwareOnDeck
)
