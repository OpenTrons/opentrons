import * as React from 'react'
import { css } from 'styled-components'
import { SPACING, StyledText } from '@opentrons/components'

interface UnorderedListProps {
  items: React.ReactNode[]
}
export function UnorderedList(props: UnorderedListProps): JSX.Element {
  const { items } = props
  return (
    <ul>
      {items.map((item, index) => (
        <li
          key={index}
          css={css`
            margin-left: ${SPACING.spacing24};
          `}
        >
          <StyledText as="p">{item}</StyledText>
        </li>
      ))}
    </ul>
  )
}
