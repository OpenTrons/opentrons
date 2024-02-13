import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { DragLayerMonitor, useDrop, useDrag } from 'react-dnd'
import isEqual from 'lodash/isEqual'

import { DND_TYPES } from '../../constants'
import { selectors as stepFormSelectors } from '../../step-forms'
import { stepIconsByType, StepIdType } from '../../form-types'
import {
  ConnectedStepItem,
  ConnectedStepItemProps,
} from '../../containers/ConnectedStepItem'
import { PDTitledList } from '../lists'
import { ContextMenu } from './ContextMenu'

import styles from './StepItem.css'

interface DragDropStepItemProps extends ConnectedStepItemProps {
  stepId: StepIdType
  findStepIndex: (stepIdType: StepIdType) => number
  clickDrop: () => void
  moveStep: (stepId: StepIdType, value: number) => void
}

interface DropType {
  stepId: StepIdType
}

const DragDropStepItem = (props: DragDropStepItemProps): JSX.Element => {
  const { stepId, moveStep, clickDrop, findStepIndex } = props
  const ref = React.useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: DND_TYPES.STEP_ITEM,
    item: { stepId },
    collect: (monitor: DragLayerMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop(() => ({
    accept: DND_TYPES.STEP_ITEM,
    canDrop: () => {
      return true
    },
    drop: () => {
      clickDrop()
    },
    hover: (item: DropType) => {
      const draggedId = item.stepId

      if (draggedId !== stepId) {
        const overIndex = findStepIndex(stepId)
        moveStep(draggedId, overIndex)
      }
    },
  }))

  drag(drop(ref))
  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.3 : 1 }}>
      <ConnectedStepItem {...props} stepId={stepId} />
    </div>
  )
}

interface StepItemsProps {
  orderedStepIds: StepIdType[]
  reorderSteps: (steps: StepIdType[]) => void
}
export const DraggableStepItems = (
  props: StepItemsProps
): JSX.Element | null => {
  const { orderedStepIds, reorderSteps } = props
  const { t } = useTranslation('shared')
  const [stepIds, setStepIds] = React.useState<StepIdType[]>(orderedStepIds)

  React.useEffect(() => {
    setStepIds(orderedStepIds)
  }, [orderedStepIds])

  const clickDrop = (): void => {
    if (!isEqual(orderedStepIds, stepIds)) {
      if (confirm(t('confirm_reorder'))) {
        reorderSteps(stepIds)
      }
    }
  }

  const moveStep = (stepId: StepIdType, targetIndex: number): void => {
    const currentIndex = findStepIndex(stepId)
    const currentRemoved = [
      ...stepIds.slice(0, currentIndex),
      ...stepIds.slice(currentIndex + 1, stepIds.length),
    ]
    const currentReinserted = [
      ...currentRemoved.slice(0, targetIndex),
      stepId,
      ...currentRemoved.slice(targetIndex, currentRemoved.length),
    ]
    setStepIds(currentReinserted)
  }
  const findStepIndex = (stepId: StepIdType): number =>
    stepIds.findIndex(id => stepId === id)

  return (
    <>
      <ContextMenu>
        {({ makeStepOnContextMenu }) =>
          stepIds.map((stepId: StepIdType, index: number) => (
            <DragDropStepItem
              key={`${stepId}_${index}`}
              stepNumber={index + 1}
              stepId={stepId}
              onStepContextMenu={() => makeStepOnContextMenu(stepId)}
              moveStep={moveStep}
              findStepIndex={findStepIndex}
              clickDrop={clickDrop}
            />
          ))
        }
      </ContextMenu>
      <StepDragPreview />
    </>
  )
}

const NAV_OFFSET = 64

const StepDragPreview = (): JSX.Element | null => {
  const [{ isDragging, itemType, item, currentOffset }] = useDrag(() => ({
    type: DND_TYPES.STEP_ITEM,
    collect: (monitor: DragLayerMonitor) => ({
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
      itemType: monitor.getItemType(),
      item: monitor.getItem() as { stepId: StepIdType },
    }),
  }))

  const savedStepForms = useSelector(stepFormSelectors.getSavedStepForms)
  const savedForm = item && savedStepForms[item.stepId]
  const { stepType, stepName } = savedForm || {}

  if (
    itemType !== DND_TYPES.STEP_ITEM ||
    !isDragging ||
    !stepType ||
    !currentOffset
  )
    return null
  return (
    <div
      className={styles.step_drag_preview}
      style={{ left: currentOffset.x - NAV_OFFSET, top: currentOffset.y }}
    >
      <PDTitledList
        iconName={stepIconsByType[stepType]}
        title={stepName || ''}
        onCollapseToggle={() => {}} // NOTE: necessary to render chevron
        collapsed
      />
    </div>
  )
}
