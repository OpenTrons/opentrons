// @flow
import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from 'styled-components'

import {
  Flex,
  Box,
  Tooltip,
  useHoverTooltip,
  Icon,
  ALIGN_CENTER,
  SIZE_2,
  SPACING_1,
  SPACING_2,
  C_NEAR_WHITE,
  C_LIGHT_GRAY,
  C_DARK_GRAY,
  BORDER_SOLID_MEDIUM,
  POSITION_STICKY,
} from '@opentrons/components'
import { useConditionalConfirm } from '../../../../../components/src/hooks/useConditionalConfirm'
import { selectors as stepFormSelectors } from '../../../step-forms'
import {
  getMultiSelectItemIds,
  actions as stepActions,
} from '../../../ui/steps'
import { getBatchEditFormHasUnsavedChanges } from '../../../step-forms/selectors'
import { deleteMultipleSteps } from '../../../steplist/actions'
import {
  CLOSE_BATCH_EDIT_FORM,
  ConfirmDeleteModal,
  DELETE_MULTIPLE_STEP_FORMS,
} from '../../modals/ConfirmDeleteModal'

import type { IconName } from '@opentrons/components'

type ClickableIconProps = {|
  iconName: IconName,
  tooltipText: string,
  width?: string,
  alignRight?: boolean,
  isLast?: boolean,
  onClick?: (event: SyntheticMouseEvent<>) => mixed,
|}

const iconBoxStyles = css`
  align-self: stretch;
  display: flex;
  align-items: center;

  &:hover {
    background-color: ${C_LIGHT_GRAY};
  }
`

export const ClickableIcon = (props: ClickableIconProps): React.Node => {
  const { iconName, onClick, tooltipText, width } = props
  const [targetProps, tooltipProps] = useHoverTooltip({
    placement: 'top',
  })

  const boxStyles = {
    padding: SPACING_1,
    marginLeft: props.alignRight ? 'auto' : 0,
  }

  return (
    <Box {...boxStyles} {...targetProps} css={iconBoxStyles}>
      <Tooltip {...tooltipProps}>{tooltipText}</Tooltip>
      <Box onClick={onClick}>
        <Icon name={iconName} width={width || '1.25rem'} color={C_DARK_GRAY} />
      </Box>
    </Box>
  )
}

export const MultiSelectToolbar = (): React.Node => {
  const dispatch = useDispatch()
  const [isExpandState, setIsExpandState] = React.useState<boolean>(true)
  const stepCount = useSelector(stepFormSelectors.getOrderedStepIds).length
  const selectedStepCount = useSelector(getMultiSelectItemIds)?.length
  const batchEditFormHasUnsavedChanges = useSelector(
    getBatchEditFormHasUnsavedChanges
  )
  const selectedStepIds = useSelector(getMultiSelectItemIds)
  const isAllStepsSelected = stepCount === selectedStepCount

  const onSelectClickAction = isAllStepsSelected
    ? () => dispatch(stepActions.deselectAllSteps())
    : () => dispatch(stepActions.selectAllSteps())

  const onDuplicateClickAction = () => {
    if (selectedStepIds) {
      dispatch(stepActions.duplicateMultipleSteps(selectedStepIds))
    } else {
      console.warn(
        'something went wrong, you cannot duplicate multiple steps if none are selected'
      )
    }
  }

  const onDeleteClickAction = () => {
    if (selectedStepIds) {
      dispatch(deleteMultipleSteps(selectedStepIds))
    } else {
      console.warn(
        'something went wrong, you cannot delete multiple steps if none are selected'
      )
    }
  }

  const {
    confirm: confirmSelect,
    showConfirmation: showSelectConfirmation,
    cancel: cancelSelect,
  } = useConditionalConfirm(onSelectClickAction, batchEditFormHasUnsavedChanges)

  const {
    confirm: confirmDuplicate,
    showConfirmation: showDuplicateConfirmation,
    cancel: cancelDuplicate,
  } = useConditionalConfirm(
    onDuplicateClickAction,
    batchEditFormHasUnsavedChanges
  )

  const {
    confirm: confirmDelete,
    showConfirmation: showDeleteConfirmation,
    cancel: cancelDelete,
  } = useConditionalConfirm(onDeleteClickAction, true)

  const selectProps = {
    iconName: isAllStepsSelected ? 'checkbox-marked' : 'minus-box',
    tooltipText: isAllStepsSelected ? 'Deselect All' : 'Select All',
    onClick: confirmSelect,
  }

  const deleteProps = {
    iconName: 'delete',
    tooltipText: 'Delete',
    width: '1.5rem',
    alignRight: true,
    onClick: confirmDelete,
  }

  const copyProps = {
    iconName: 'content-copy',
    tooltipText: 'Duplicate',
    onClick: confirmDuplicate,
  }

  const expandProps = {
    iconName: isExpandState
      ? 'unfold-more-horizontal'
      : 'unfold-less-horizontal',
    tooltipText: isExpandState ? 'Expand' : 'Collapse',
    onClick: () => {
      if (selectedStepIds) {
        if (isExpandState) {
          dispatch(stepActions.expandMultipleSteps(selectedStepIds))
        } else {
          dispatch(stepActions.collapseMultipleSteps(selectedStepIds))
        }
        setIsExpandState(!isExpandState)
      } else {
        console.warn(
          'something went wrong, you cannot toggle multiple steps if none are selected'
        )
      }
    },
    isLast: true,
  }

  return (
    <>
      {showSelectConfirmation && (
        <ConfirmDeleteModal
          modalType={CLOSE_BATCH_EDIT_FORM}
          onContinueClick={confirmSelect}
          onCancelClick={cancelSelect}
        />
      )}
      {showDuplicateConfirmation && (
        <ConfirmDeleteModal
          modalType={CLOSE_BATCH_EDIT_FORM}
          onContinueClick={confirmDuplicate}
          onCancelClick={cancelDuplicate}
        />
      )}
      {showDeleteConfirmation && (
        <ConfirmDeleteModal
          modalType={DELETE_MULTIPLE_STEP_FORMS}
          onContinueClick={confirmDelete}
          onCancelClick={cancelDelete}
        />
      )}
      <Flex
        alignItems={ALIGN_CENTER}
        height={SIZE_2}
        padding={`0 ${SPACING_2}`}
        borderBottom={BORDER_SOLID_MEDIUM}
        position={POSITION_STICKY}
        top="0"
        backgroundColor={C_NEAR_WHITE}
        zIndex="100"
      >
        <ClickableIcon {...selectProps} />
        <ClickableIcon {...deleteProps} />
        <ClickableIcon {...copyProps} />
        <ClickableIcon {...expandProps} />
      </Flex>
    </>
  )
}
