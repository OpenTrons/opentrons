import { css } from 'styled-components'
import { Flex } from '../../primitives'
import { SPACING } from '../../ui-style-constants'
import { BORDERS, COLORS } from '../../helix-design-system'
import { CURSOR_DEFAULT, CURSOR_POINTER } from '../../styles'

import type { ReactNode } from 'react'
import type { StyleProps } from '../../primitives'

export * from './ListButtonChildren/index'

export type ListButtonType =
  | 'noActive'
  | 'connected'
  | 'notConnected'
  | 'onColor'

interface ListButtonProps extends StyleProps {
  type: ListButtonType
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  testId?: string
}

const LISTBUTTON_PROPS_BY_TYPE: Record<
  ListButtonType,
  { backgroundColor: string; hoverBackgroundColor: string }
> = {
  noActive: {
    backgroundColor: COLORS.grey20,
    hoverBackgroundColor: COLORS.grey30,
  },
  connected: {
    backgroundColor: COLORS.green30,
    hoverBackgroundColor: COLORS.green35,
  },
  notConnected: {
    backgroundColor: COLORS.yellow30,
    hoverBackgroundColor: COLORS.yellow35,
  },
  onColor: {
    backgroundColor: COLORS.white,
    hoverBackgroundColor: COLORS.grey10,
  },
}

/*
  ListButton is used in helix 
  TODO(ja, 8/12/24): shuld be used in ODD as well and need to add
  odd stylings
**/
export function ListButton(props: ListButtonProps): JSX.Element {
  const {
    type,
    children,
    disabled = false,
    onClick,
    testId, // optional data-testid value for Cypress testing
    ...styleProps
  } = props
  const listButtonProps = LISTBUTTON_PROPS_BY_TYPE[type]

  const LIST_BUTTON_STYLE = css`
    cursor: ${disabled ? CURSOR_DEFAULT : CURSOR_POINTER};
    background-color: ${disabled
      ? COLORS.grey20
      : listButtonProps.backgroundColor};
    max-width: 26.875rem;
    padding: ${styleProps.padding ??
    `${SPACING.spacing20} ${SPACING.spacing24}`};
    border-radius: ${BORDERS.borderRadius8};

    &:hover {
      background-color: ${disabled
        ? COLORS.grey20
        : listButtonProps.hoverBackgroundColor};
    }

    &:focus-visible {
      outline: 2px solid ${COLORS.blue50};
      outline-offset: 0.25rem;
    }
  `

  return (
    <Flex
      data-testid={testId ?? `ListButton_${type}`}
      onClick={onClick}
      css={LIST_BUTTON_STYLE}
      tabIndex={0}
      {...styleProps}
    >
      {children}
    </Flex>
  )
}
