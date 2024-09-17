import * as React from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  NO_WRAP,
  POSITION_ABSOLUTE,
  SPACING,
} from '@opentrons/components'
import { actions as steplistActions } from '../../../../steplist'
import { actions as stepsActions } from '../../../../ui/steps'

import type { ThunkDispatch } from 'redux-thunk'
import type { BaseState } from '../../../../types'
import type { StepIdType } from '../../../../form-types'

interface StepOverflowMenuProps {
  stepId: string
  menuRootRef: React.MutableRefObject<HTMLDivElement | null>
  top: number
}

export function StepOverflowMenu(props: StepOverflowMenuProps): JSX.Element {
  const { stepId, menuRootRef, top } = props
  const { t } = useTranslation('protocol_steps')
  const dispatch = useDispatch<ThunkDispatch<BaseState, any, any>>()
  const deleteStep = (stepId: StepIdType): void => {
    dispatch(steplistActions.deleteStep(stepId))
  }
  const duplicateStep = (
    stepId: StepIdType
  ): ReturnType<typeof stepsActions.duplicateStep> =>
    dispatch(stepsActions.duplicateStep(stepId))

  return (
    <Flex
      ref={menuRootRef}
      zIndex={5}
      top={top}
      left="19.5rem"
      position={POSITION_ABSOLUTE}
      whiteSpace={NO_WRAP}
      borderRadius={BORDERS.borderRadius8}
      boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
      backgroundColor={COLORS.white}
      flexDirection={DIRECTION_COLUMN}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <MenuButton
        onClick={() => {
          console.log('wire this up')
        }}
      >
        {t('rename')}
      </MenuButton>
      <MenuButton
        onClick={() => {
          console.log('wire this up')
        }}
      >
        {t('view_commands')}
      </MenuButton>
      <MenuButton
        onClick={() => {
          duplicateStep(stepId)
        }}
      >
        {t('duplicate')}
      </MenuButton>
      <MenuButton
        onClick={() => {
          deleteStep(stepId)
        }}
      >
        {t('delete')}
      </MenuButton>
    </Flex>
  )
}

const MenuButton = styled.button`
  background-color: ${COLORS.transparent};
  align-items: ${ALIGN_CENTER};
  grid-gap: ${SPACING.spacing8};
  width: 100%;
  cursor: pointer;
  padding: ${SPACING.spacing8} ${SPACING.spacing12};
  border: none;
  border-radius: inherit;
  display: flex;
  &:hover {
    background-color: ${COLORS.blue10};
  }
  &:disabled {
    color: ${COLORS.grey40};
    cursor: auto;
  }
`
