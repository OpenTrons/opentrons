import { css } from 'styled-components'

import { StyledText } from '../StyledText'
import { DIRECTION_COLUMN, DISPLAY_GRID } from '../../styles'
import { SPACING, RESPONSIVENESS } from '../../ui-style-constants'
import { COLORS } from '../../helix-design-system'
import { Flex } from '../../primitives'

import type { ReactNode } from 'react'
import type { FlattenSimpleInterpolation } from 'styled-components'

export interface SubListTableProps {
  children: ReactNode
  headers?: [string?, string?, string?, string?] // maximum of 4
}

// SubListTable does not contain the semantic HTML table identity but is otherwise equivalent to ListTable.
// Use SubListTable only when there should a table-esque component in a real table (ListTable), otherwise use ListTable.
export function SubListTable({
  headers,
  children,
}: SubListTableProps): JSX.Element {
  const numHeaders = headers ? headers.filter(Boolean).length : 0

  return (
    <Flex css={CONTAINER_STYLE}>
      {headers != null && headers.some(header => header !== undefined) && (
        <div css={headerContainerStyle(numHeaders)}>
          {headers?.map(header => (
            <StyledText
              key={header + Math.random().toString()}
              oddStyle="bodyTextSemiBold"
              desktopStyle="bodyDefaultRegular"
              css={HEADER_ITEM_STYLE}
            >
              {header}
            </StyledText>
          ))}
        </div>
      )}
      <Flex css={CONTENT_CONTAINER_STYLE}>{children}</Flex>
    </Flex>
  )
}

const CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  gap: ${SPACING.spacing8};
`

const CONTENT_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  gap: ${SPACING.spacing4};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    gap: ${SPACING.spacing8};
  }
`

const headerContainerStyle = (
  numHeaders: number
): FlattenSimpleInterpolation => css`
  display: ${DISPLAY_GRID};
  grid-template-columns: repeat(${numHeaders}, 1fr);
  padding: 0 ${SPACING.spacing12};
  gap: ${SPACING.spacing24};
`

const HEADER_ITEM_STYLE = css`
  color: ${COLORS.grey60};
`
