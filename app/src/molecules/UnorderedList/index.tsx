import styled from 'styled-components'
import { SPACING, LegacyStyledText } from '@opentrons/components'

import type { ReactNode } from 'react'

const ListItem = styled.li`
  margin-left: ${SPACING.spacing24};
`

interface UnorderedListProps {
  items: ReactNode[]
}

export function UnorderedList(props: UnorderedListProps): JSX.Element {
  const { items } = props
  return (
    <ul>
      {items.map((item, index) => (
        <ListItem key={index}>
          <LegacyStyledText as="p">{item}</LegacyStyledText>
        </ListItem>
      ))}
    </ul>
  )
}
