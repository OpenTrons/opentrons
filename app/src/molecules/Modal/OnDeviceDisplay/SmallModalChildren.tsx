import * as React from 'react'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  TYPOGRAPHY,
  BORDERS,
} from '@opentrons/components'

import { StyledText } from '../../../atoms/text'
import { Modal } from '.'

interface SmallModalChildrenProps {
  handleCloseMaxPinsAlert: () => void
  header: string
  subText: string
  buttonText: string
}
export function SmallModalChildren(
  props: SmallModalChildrenProps
): JSX.Element {
  const { handleCloseMaxPinsAlert, header, subText, buttonText } = props

  return (
    <Modal onOutsideClick={handleCloseMaxPinsAlert} modalSize="small">
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing3}
        width="100%"
      >
        <StyledText
          color={COLORS.darkBlackEnabled}
          fontSize={TYPOGRAPHY.fontSize28}
          fontWeight={TYPOGRAPHY.fontWeightBold}
          lineHeight={TYPOGRAPHY.lineHeight36}
          textAlign={TYPOGRAPHY.textAlignCenter}
        >
          {header}
        </StyledText>
        <StyledText
          color={COLORS.darkBlack_ninety}
          fontSize={TYPOGRAPHY.fontSize22}
          fontWeight={TYPOGRAPHY.fontWeightRegular}
          lineHeight={TYPOGRAPHY.lineHeight28}
          textAlign={TYPOGRAPHY.textAlignCenter}
        >
          {subText}
        </StyledText>

        <Flex
          backgroundColor={COLORS.blueEnabled}
          borderRadius={BORDERS.size_three}
          flexDirection={DIRECTION_COLUMN}
          marginTop={SPACING.spacing6}
          onClick={handleCloseMaxPinsAlert}
          padding={SPACING.spacing4}
        >
          <StyledText
            color={COLORS.white}
            fontSize={TYPOGRAPHY.fontSize22}
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            lineHeight={TYPOGRAPHY.lineHeight28}
            textAlign={TYPOGRAPHY.textAlignCenter}
            textTransform={TYPOGRAPHY.textTransformCapitalize}
          >
            {buttonText}
          </StyledText>
        </Flex>
      </Flex>
    </Modal>
  )
}
