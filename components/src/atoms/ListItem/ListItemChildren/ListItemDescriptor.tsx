import * as React from 'react'
import { Flex } from '../../../primitives'
import {
  DIRECTION_ROW,
  FLEX_AUTO,
  JUSTIFY_SPACE_BETWEEN,
} from '../../../styles'
import { SPACING } from '../../../ui-style-constants'

interface ListItemDescriptorProps {
  type: 'default' | 'mini'
  description: JSX.Element | string
  content: JSX.Element | string
}

export const ListItemDescriptor = (
  props: ListItemDescriptorProps
): JSX.Element => {
  const { description, content, type } = props
  return (
    <Flex
      flexDirection={DIRECTION_ROW}
      gridGap={SPACING.spacing8}
      width="100%"
      justifyContent={type === 'mini' ? JUSTIFY_SPACE_BETWEEN : 'none'}
      padding={
        type === 'mini'
          ? `${SPACING.spacing4} ${SPACING.spacing8}`
          : SPACING.spacing12
      }
    >
      <Flex width={type === 'mini' ? FLEX_AUTO : '40%'}>{description}</Flex>
      {content}
    </Flex>
  )
}
