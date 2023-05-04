import * as labwareIngredsActions from '../../labware-ingred/actions'
import { selectors } from '../../labware-ingred/selectors'
import { ContentsByWell } from '../../labware-ingred/types'
import { i18n } from '../../localization'
import { selectors as stepFormSelectors } from '../../step-forms'
import { WellIngredientNames } from '../../steplist/types'
import * as wellContentsSelectors from '../../top-selectors/well-contents'
import { BaseState, ThunkDispatch } from '../../types'
import modalStyles from '../modals/modal.css'
import { BrowsableLabware } from './BrowsableLabware'
import styles from './labware.css'
import { Modal } from '@opentrons/components'
import { LabwareDefinition2 } from '@opentrons/shared-data'
import assert from 'assert'
import cx from 'classnames'
import * as React from 'react'
import { connect } from 'react-redux'

interface SP {
  definition?: LabwareDefinition2 | null
  wellContents: ContentsByWell
  ingredNames: WellIngredientNames
}

interface DP {
  drillUp: () => unknown
}

type Props = SP & DP

const BrowseLabwareModalComponent = (props: Props): JSX.Element | null => {
  const { drillUp, definition, ingredNames, wellContents } = props
  if (!definition) {
    assert(definition, 'BrowseLabwareModal expected definition')
    return null
  }

  return (
    <Modal
      className={modalStyles.modal}
      contentsClassName={cx(
        modalStyles.modal_contents,
        modalStyles.transparent_content
      )}
      onCloseClick={drillUp}
    >
      <BrowsableLabware
        definition={definition}
        ingredNames={ingredNames}
        wellContents={wellContents}
      />
      <div className={styles.modal_instructions}>
        {i18n.t('modal.browse_labware.instructions')}
      </div>
    </Modal>
  )
}

function mapStateToProps(state: BaseState): SP {
  const labwareId = selectors.getDrillDownLabwareId(state)
  const definition = labwareId
    ? stepFormSelectors.getLabwareEntities(state)[labwareId]?.def
    : null

  const allWellContentsForActiveItem = wellContentsSelectors.getAllWellContentsForActiveItem(
    state
  )
  const wellContents =
    labwareId && allWellContentsForActiveItem
      ? allWellContentsForActiveItem[labwareId]
      : null
  const ingredNames = selectors.getLiquidNamesById(state)
  return {
    wellContents,
    ingredNames,
    definition,
  }
}

function mapDispatchToProps(dispatch: ThunkDispatch<any>): DP {
  return { drillUp: () => dispatch(labwareIngredsActions.drillUpFromLabware()) }
}

export const BrowseLabwareModal = connect(
  mapStateToProps,
  mapDispatchToProps
)(BrowseLabwareModalComponent)
