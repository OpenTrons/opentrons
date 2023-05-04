import { LabwareOnDeck } from '../../../step-forms'
import { START_TERMINAL_ITEM_ID, TerminalItemId } from '../../../steplist'
import { BlockedSlot } from './BlockedSlot'
import { BrowseLabware } from './BrowseLabware'
import { EditLabware } from './EditLabware'
import { LabwareHighlight } from './LabwareHighlight'
import { LabwareName } from './LabwareName'
import styles from './LabwareOverlays.css'
import { RobotCoordsForeignDiv } from '@opentrons/components'
import { DeckSlot } from '@opentrons/shared-data'
import cx from 'classnames'
import * as React from 'react'

interface LabwareControlsProps {
  labwareOnDeck: LabwareOnDeck
  selectedTerminalItemId?: TerminalItemId | null
  slot: DeckSlot
  setHoveredLabware: (labware?: LabwareOnDeck | null) => unknown
  setDraggedLabware: (labware?: LabwareOnDeck | null) => unknown
  swapBlocked: boolean
}

export const LabwareControls = (props: LabwareControlsProps): JSX.Element => {
  const {
    labwareOnDeck,
    slot,
    selectedTerminalItemId,
    setHoveredLabware,
    setDraggedLabware,
    swapBlocked,
  } = props
  const canEdit = selectedTerminalItemId === START_TERMINAL_ITEM_ID
  const [x, y] = slot.position
  const width = labwareOnDeck.def.dimensions.xDimension
  const height = labwareOnDeck.def.dimensions.yDimension
  return (
    <>
      <RobotCoordsForeignDiv
        {...{ x, y, width, height }}
        innerDivProps={{
          className: cx(styles.labware_controls, {
            [styles.can_edit]: canEdit,
          }),
        }}
      >
        <LabwareHighlight labwareOnDeck={labwareOnDeck} />
        {canEdit ? (
          // @ts-expect-error(sa, 2021-6-21): react dnd type mismatch
          <EditLabware
            labwareOnDeck={labwareOnDeck}
            setHoveredLabware={setHoveredLabware}
            setDraggedLabware={setDraggedLabware}
            swapBlocked={swapBlocked}
          />
        ) : (
          <BrowseLabware labwareOnDeck={labwareOnDeck} />
        )}
        <LabwareName labwareOnDeck={labwareOnDeck} />
      </RobotCoordsForeignDiv>
      {swapBlocked && (
        <BlockedSlot
          {...{ x, y, width, height }}
          message="MODULE_INCOMPATIBLE_LABWARE_SWAP"
        />
      )}
    </>
  )
}
