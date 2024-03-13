import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import cx from 'classnames'
import { Icon } from '@opentrons/components'
import { getLabwareDisplayName } from '@opentrons/shared-data'
import { DropTargetMonitor, useDrag, useDrop } from 'react-dnd'
import { NameThisLabware } from './NameThisLabware'
import { DND_TYPES } from '../../../constants'
import {
  deleteContainer,
  duplicateLabware,
  moveDeckItem,
  openIngredientSelector,
} from '../../../labware-ingred/actions'
import { selectors as labwareIngredSelectors } from '../../../labware-ingred/selectors'
import { ThunkDispatch } from '../../../types'
import { LabwareOnDeck } from '../../../step-forms'
import styles from './LabwareOverlays.module.css'

interface Props {
  labwareOnDeck: LabwareOnDeck
  setHoveredLabware: (val?: LabwareOnDeck | null) => void
  setDraggedLabware: (val?: LabwareOnDeck | null) => void
  swapBlocked: boolean
}

interface DroppedItem {
  labwareOnDeck: LabwareOnDeck
}
export const EditLabware = (props: Props): JSX.Element | null => {
  const {
    labwareOnDeck,
    swapBlocked,
    setDraggedLabware,
    setHoveredLabware,
  } = props
  const savedLabware = useSelector(labwareIngredSelectors.getSavedLabware)
  const dispatch = useDispatch<ThunkDispatch<any>>()
  const { t } = useTranslation('deck')
  const ref = React.useRef(null)

  const { isTiprack } = labwareOnDeck.def.parameters
  const hasName = savedLabware[labwareOnDeck.id]
  const isYetUnnamed = !labwareOnDeck.def.parameters.isTiprack && !hasName

  const editLiquids = (): void => {
    dispatch(openIngredientSelector(labwareOnDeck.id))
  }

  const [, drag] = useDrag(
    () => ({
      type: DND_TYPES.LABWARE,
      item: { labwareOnDeck },
    }),
    [labwareOnDeck]
  )

  const [{ draggedLabware, isOver }, drop] = useDrop(
    () => ({
      accept: DND_TYPES.LABWARE,
      canDrop: (item: DroppedItem) => {
        const draggedLabware = item?.labwareOnDeck
        const isDifferentSlot =
          draggedLabware && draggedLabware.slot !== labwareOnDeck.slot
        return isDifferentSlot && !swapBlocked
      },
      drop: (item: DroppedItem) => {
        const draggedLabware = item?.labwareOnDeck
        if (draggedLabware != null) {
          dispatch(moveDeckItem(draggedLabware.slot, labwareOnDeck.slot))
        }
      },

      hover: (item: DroppedItem, monitor: DropTargetMonitor) => {
        if (monitor.canDrop()) {
          setHoveredLabware(labwareOnDeck)
        }
      },
      collect: (monitor: DropTargetMonitor) => ({
        isOver: monitor.isOver(),
        draggedLabware: monitor.getItem() as DroppedItem,
      }),
    }),
    [labwareOnDeck]
  )

  React.useEffect(() => {
    if (draggedLabware?.labwareOnDeck != null) {
      setDraggedLabware(draggedLabware?.labwareOnDeck)
    } else {
      setHoveredLabware(null)
      setDraggedLabware(null)
    }
  })

  if (isYetUnnamed && !isTiprack) {
    return (
      <NameThisLabware
        labwareOnDeck={labwareOnDeck}
        editLiquids={editLiquids}
      />
    )
  } else {
    const isBeingDragged =
      draggedLabware?.labwareOnDeck?.slot === labwareOnDeck.slot

    let contents: React.ReactNode | null = null

    if (swapBlocked) {
      contents = null
    } else if (draggedLabware != null) {
      contents = null
    } else {
      contents = (
        <>
          {!isTiprack ? (
            <a className={styles.overlay_button} onClick={editLiquids}>
              <Icon className={styles.overlay_icon} name="pencil" />
              {t('overlay.edit.name_and_liquids')}
            </a>
          ) : (
            <div className={styles.button_spacer} />
          )}
          <a
            className={styles.overlay_button}
            onClick={() => dispatch(duplicateLabware(labwareOnDeck.id))}
          >
            <Icon className={styles.overlay_icon} name="content-copy" />
            {t('overlay.edit.duplicate')}
          </a>
          <a
            className={styles.overlay_button}
            onClick={() => {
              window.confirm(
                `Are you sure you want to permanently delete this ${getLabwareDisplayName(
                  labwareOnDeck.def
                )}?`
              ) && dispatch(deleteContainer({ labwareId: labwareOnDeck.id }))
            }}
          >
            <Icon className={styles.overlay_icon} name="close" />
            {t('overlay.edit.delete')}
          </a>
        </>
      )
    }

    drag(drop(ref))

    const dragResult = (
      <div
        ref={ref}
        className={cx(styles.slot_overlay, {
          [styles.appear_on_mouseover]: !isBeingDragged && !isYetUnnamed,
          [styles.appear]: isOver,
          [styles.disabled]: isBeingDragged,
        })}
      >
        {contents}
      </div>
    )

    return dragResult !== null ? dragResult : null
  }
}
