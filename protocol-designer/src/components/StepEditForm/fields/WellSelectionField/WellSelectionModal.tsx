// @flow
import * as React from 'react'
import cx from 'classnames'
import { useSelector } from 'react-redux'
import omit from 'lodash/omit'

import { Modal, OutlineButton, LabeledValue } from '@opentrons/components'
import { sortWells } from '@opentrons/shared-data'

import { arrayToWellGroup } from '../../../../utils'
import { WellSelectionInstructions } from '../../../WellSelectionInstructions'
import { SelectableLabware, wellFillFromWellContents } from '../../../labware'

import * as wellContentsSelectors from '../../../../top-selectors/well-contents'
import { selectors } from '../../../../labware-ingred/selectors'
import { selectors as stepFormSelectors } from '../../../../step-forms'
import { WellGroup } from '@opentrons/components'
import { LabwareDefinition2, PipetteNameSpecs } from '@opentrons/shared-data'
import { ContentsByWell } from '../../../../labware-ingred/types'
import { WellIngredientNames } from '../../../../steplist/types'
import { StepFieldName } from '../../../../form-types'

import styles from './WellSelectionModal.css'
import modalStyles from '../../../modals/modal.css'

type WellSelectionModalProps = {
  isOpen: boolean
  labwareId: string | null | undefined
  name: StepFieldName
  onCloseClick: (e: React.MouseEvent | null | undefined) => unknown
  pipetteId: string | null | undefined
  value: unknown
  updateValue: (val: unknown | null | undefined) => void
}

type WellSelectionModalComponentProps = {
  deselectWells: (wellGroup: WellGroup) => unknown
  handleSave: () => unknown
  highlightedWells: WellGroup
  ingredNames: WellIngredientNames
  labwareDef: LabwareDefinition2 | null | undefined
  onCloseClick: (e: React.MouseEvent | null | undefined) => unknown
  pipetteSpec: PipetteNameSpecs | null | undefined
  selectedPrimaryWells: WellGroup
  selectWells: (wellGroup: WellGroup) => unknown
  updateHighlightedWells: (wellGroup: WellGroup) => unknown
  wellContents: ContentsByWell
}

const WellSelectionModalComponent = (
  props: WellSelectionModalComponentProps
) => {
  const {
    deselectWells,
    handleSave,
    highlightedWells,
    ingredNames,
    labwareDef,
    onCloseClick,
    pipetteSpec,
    selectedPrimaryWells,
    selectWells,
    wellContents,
    updateHighlightedWells,
  } = props

  return (
    <Modal
      className={modalStyles.modal}
      contentsClassName={cx(
        modalStyles.modal_contents,
        modalStyles.transparent_content
      )}
      onCloseClick={onCloseClick}
    >
      <div className={styles.top_row}>
        <LabeledValue
          label="Pipette"
          value={pipetteSpec ? pipetteSpec.displayName : ''}
          className={styles.inverted_text}
        />
        <OutlineButton onClick={handleSave} inverted>
          SAVE SELECTION
        </OutlineButton>
      </div>

      {labwareDef && (
        <SelectableLabware
          labwareProps={{
            showLabels: true,
            definition: labwareDef,
            highlightedWells,
            wellFill: wellFillFromWellContents(wellContents),
          }}
          selectedPrimaryWells={selectedPrimaryWells}
          selectWells={selectWells}
          deselectWells={deselectWells}
          updateHighlightedWells={updateHighlightedWells}
          pipetteChannels={pipetteSpec ? pipetteSpec.channels : null}
          ingredNames={ingredNames}
          wellContents={wellContents}
        />
      )}

      <WellSelectionInstructions />
    </Modal>
  )
}

export const WellSelectionModal = (
  props: WellSelectionModalProps
): React.Node => {
  const { isOpen, labwareId, onCloseClick, pipetteId } = props
  const wellFieldData = props.value

  // selector data
  const allWellContentsForStep = useSelector(
    wellContentsSelectors.getAllWellContentsForActiveItem
  )

  const ingredNames = useSelector(selectors.getLiquidNamesById)
  const labwareEntities = useSelector(stepFormSelectors.getLabwareEntities)
  const pipetteEntities = useSelector(stepFormSelectors.getPipetteEntities)

  // selector-derived data
  const labwareDef = (labwareId && labwareEntities[labwareId]?.def) || null
  const pipette = pipetteId != null ? pipetteEntities[pipetteId] : null

  const initialSelectedPrimaryWells = Array.isArray(wellFieldData)
    ? // $FlowFixMe(IL, 2021-03-22): FormData values are poorly typed, address in #3161
      arrayToWellGroup(wellFieldData)
    : {}

  // component state
  const [
    selectedPrimaryWells,
    setSelectedPrimaryWells,
  ] = React.useState<WellGroup>(initialSelectedPrimaryWells)
  const [highlightedWells, setHighlightedWells] = React.useState<WellGroup>({})

  // actions
  const selectWells = (wells: WellGroup) => {
    setSelectedPrimaryWells(prev => ({ ...prev, ...wells }))
    setHighlightedWells({})
  }

  const deselectWells = (deselectedWells: WellGroup) => {
    setSelectedPrimaryWells(prev => omit(prev, Object.keys(deselectedWells)))
    setHighlightedWells({})
  }

  const handleSave = () => {
    const sortedWells = Object.keys(selectedPrimaryWells).sort(sortWells)
    props.updateValue(sortedWells)
    onCloseClick()
  }

  if (!isOpen) return null

  return (
    <WellSelectionModalComponent
      {...{
        deselectWells,
        handleSave,
        highlightedWells,
        ingredNames,
        labwareDef,
        onCloseClick,
        pipetteSpec: pipette?.spec,
        selectWells,
        selectedPrimaryWells,
        updateHighlightedWells: setHighlightedWells,
        wellContents:
          labwareId != null && allWellContentsForStep != null
            ? allWellContentsForStep[labwareId]
            : {},
      }}
    />
  )
}
