import * as React from 'react'
import {
  Box,
  Flex,
  SPACING,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
} from '@opentrons/components'
import { StyledText } from '../text'
import { Line } from './index'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'App/Atoms/Line',
  component: Line,
} as Meta

const Template: Story<React.ComponentProps<typeof Line>> = args => (
  <>
    <Box paddingBottom={SPACING.spacing24}>
      <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_BETWEEN}>
        <Box marginRight={SPACING.spacing32}>
          <Box marginBottom={SPACING.spacing8}>
            <StyledText as="h3SemiBold">{'About Calibration'}</StyledText>
          </Box>
          <StyledText as="p" marginBottom={SPACING.spacing8}>
            {'This section is about calibration.'}
          </StyledText>
        </Box>
      </Flex>
    </Box>
    <Line {...args} />
    <Box paddingTop={SPACING.spacing24} paddingBottom={SPACING.spacing24}>
      <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_BETWEEN}>
        <Box marginRight={SPACING.spacing32}>
          <Box marginBottom={SPACING.spacing8}>
            <StyledText as="h3SemiBold">{'Deck Calibration'}</StyledText>
          </Box>
          <StyledText as="p" marginBottom={SPACING.spacing8}>
            {'This section is for deck calibration.'}
          </StyledText>
        </Box>
      </Flex>
    </Box>
  </>
)

export const Primary = Template.bind({})
Primary.args = {
  marginY: SPACING.spacing8,
}
