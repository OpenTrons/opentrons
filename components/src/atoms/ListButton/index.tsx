import { css } from 'styled-components'
import { Flex } from '../../primitives'
import { SPACING, RESPONSIVENESS } from '../../ui-style-constants'
import { BORDERS, COLORS } from '../../helix-design-system'
import { CURSOR_DEFAULT, CURSOR_POINTER } from '../../styles'

import type { ReactNode } from 'react'
import type { StyleProps } from '../../primitives'

export * from './ListButtonChildren/index'

type ListButtonType = 'noActive' | 'connected' | 'notConnected' | 'onColor'

interface ListButtonProps extends StyleProps {
  type: ListButtonType
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  testId?: string
}

const DESKTOP_LISTBUTTON_PROPS_BY_TYPE: Record<
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

const ODD_LISTBUTTON_PROPS_BY_TYPE: Record<
  ListButtonType,
  { backgroundColor: string; hoverBackgroundColor: string }
> = {
  noActive: {
    backgroundColor: COLORS.grey35,
    hoverBackgroundColor: COLORS.grey40,
  },
  connected: {
    backgroundColor: COLORS.green35,
    hoverBackgroundColor: COLORS.green40,
  },
  notConnected: {
    backgroundColor: COLORS.yellow35,
    hoverBackgroundColor: COLORS.yellow40,
  },
  onColor: {
    backgroundColor: COLORS.white,
    hoverBackgroundColor: COLORS.grey20,
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
  const desktopListButtonProps = DESKTOP_LISTBUTTON_PROPS_BY_TYPE[type]
  const oddListButtonProps = ODD_LISTBUTTON_PROPS_BY_TYPE[type]

  const LIST_BUTTON_STYLE = css`
    cursor: ${disabled ? CURSOR_DEFAULT : CURSOR_POINTER};
    background-color: ${disabled
      ? COLORS.grey20
      : desktopListButtonProps.backgroundColor};
    padding: ${styleProps.padding ??
    `${SPACING.spacing20} ${SPACING.spacing24}`};
    border-radius: ${BORDERS.borderRadius8};

    &:hover {
      background-color: ${disabled
        ? COLORS.grey20
        : desktopListButtonProps.hoverBackgroundColor};
    }

    &:focus-visible {
      outline: 2px solid ${COLORS.blue50};
      outline-offset: 0.125rem;
    }

    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      background-color: ${disabled
        ? COLORS.grey35
        : oddListButtonProps.backgroundColor};

      &:hover {
        background-color: ${disabled
          ? COLORS.grey35
          : oddListButtonProps.hoverBackgroundColor};
      }
    }
  `

  return (
    <Flex
      data-testid={testId ?? `ListButton_${type}`}
      onClick={(e: MouseEvent) => {
        onClick?.()
        e.stopPropagation()
      }}
      css={LIST_BUTTON_STYLE}
      tabIndex={0}
      max-width="26.875rem"
      {...styleProps}
    >
      {children}
    </Flex>
  )
}
