import * as React from 'react'
import {
  Flex,
  COLORS,
  DIRECTION_COLUMN,
  SPACING,
  TYPOGRAPHY,
  Box,
  ALIGN_FLEX_START,
  BORDERS,
} from '@opentrons/components'

import type { Story, Meta } from '@storybook/react'

import { StyledText } from '../../atoms/text'

export default {
  title: 'Design Tokens/BorderRadius',
} as Meta

interface BorderRadiusStorybookProps {
  borderRadius: string[]
}

const Template: Story<BorderRadiusStorybookProps> = args => {
  const targetBorderRadiuses = args.borderRadius.filter(s =>
    s[0].includes('size_')
  )
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing3}
      padding={SPACING.spacing5}
    >
      {targetBorderRadiuses.map((br, index) => (
        <Flex
          key={`spacing_${index}`}
          flexDirection={DIRECTION_COLUMN}
          alignItems={ALIGN_FLEX_START}
          padding={SPACING.spacing4}
          gridGap={SPACING.spacing3}
          width="100%"
          height="6rem"
        >
          <StyledText as="h2" fontWeight={TYPOGRAPHY.fontWeightRegular}>
            {`${br[0]}" ${br[1]}`}
          </StyledText>
          <Box
            width="10rem"
            height="4rem"
            backgroundColor={COLORS.blueEnabled}
            borderRadius={br[1]}
          />
        </Flex>
      ))}
    </Flex>
  )
}

export const AllBorderRadiuses = Template.bind({})
const allBorderRadiuses = Object.entries(BORDERS)
AllBorderRadiuses.args = {
  borderRadius: allBorderRadiuses,
}
