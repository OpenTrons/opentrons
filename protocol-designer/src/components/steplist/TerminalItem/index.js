// @flow
import * as React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useConditionalConfirm } from '@opentrons/components'
import {
  getHoveredTerminalItemId,
  getSelectedTerminalItemId,
  getIsMultiSelectMode,
  actions as stepsActions,
} from '../../../ui/steps'
import {
  getCurrentFormIsPresaved,
  getCurrentFormHasUnsavedChanges,
} from '../../../step-forms/selectors'
import {
  ConfirmDeleteModal,
  CLOSE_STEP_FORM_WITH_CHANGES,
  CLOSE_UNSAVED_STEP_FORM,
} from '../../modals/ConfirmDeleteModal'
import { PDTitledList } from '../../lists'
import type { TerminalItemId } from '../../../steplist'

export { TerminalItemLink } from './TerminalItemLink'

type Props = {|
  children?: React.Node,
  id: TerminalItemId,
  title: string,
|}

export const TerminalItem = (props: Props): React.Node => {
  const { id, title, children } = props
  // const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)

  const hovered = useSelector(getHoveredTerminalItemId) === id
  const selected = useSelector(getSelectedTerminalItemId) === id
  const currentFormIsPresaved = useSelector(getCurrentFormIsPresaved)
  const formHasChanges = useSelector(getCurrentFormHasUnsavedChanges)
  const isMultiSelectMode = useSelector(getIsMultiSelectMode)

  const dispatch = useDispatch()

  const selectItem = () => dispatch(stepsActions.selectTerminalItem(id))

  const onMouseEnter = () => dispatch(stepsActions.hoverOnTerminalItem(id))
  const onMouseLeave = () => dispatch(stepsActions.hoverOnTerminalItem(null))

  const { confirm, showConfirmation, cancel } = useConditionalConfirm(
    selectItem,
    currentFormIsPresaved || formHasChanges
  )

  const onClick = isMultiSelectMode ? () => null : confirm

  return (
    <>
      {showConfirmation && (
        <ConfirmDeleteModal
          modalType={
            currentFormIsPresaved
              ? CLOSE_UNSAVED_STEP_FORM
              : CLOSE_STEP_FORM_WITH_CHANGES
          }
          onContinueClick={confirm}
          onCancelClick={cancel}
        />
      )}
      <PDTitledList
        {...{
          id: `TerminalItem_${id}`,
          hovered,
          selected,
          title,
          children,
          onClick: onClick,
          onMouseEnter,
          onMouseLeave,
        }}
      />
    </>
  )
}
