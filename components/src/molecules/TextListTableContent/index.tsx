import { css } from 'styled-components'

import { SPACING, RESPONSIVENESS } from '../../ui-style-constants'
import { ListTable } from '../../atoms/ListTable'
import { StyledText } from '../../atoms'
import { Flex } from '../../primitives'
import { DIRECTION_COLUMN } from '../../styles'

import type { ReactNode } from 'react'
import type { ListTableProps } from '../../atoms/ListTable'

export interface TextListTableContentProps {
  /* The text that appears above the table. */
  header: ReactNode
  listTableHeaders?: ListTableProps['headers']
  /* The ListTable content. See dev comments on ListTable for proper usage. */
  children: ReactNode
}

export function TextListTableContent({
  header,
  listTableHeaders,
  children,
}: TextListTableContentProps): JSX.Element {
  return (
    <Flex css={CONTAINER_STYLE}>
      <StyledText
        oddStyle="level4HeaderRegular"
        desktopStyle="bodyDefaultRegular"
      >
        {header}
      </StyledText>
      <ListTable headers={listTableHeaders}>{children}</ListTable>
    </Flex>
  )
}

const CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  gap: ${SPACING.spacing16};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    gap: ${SPACING.spacing24};
  }
`
