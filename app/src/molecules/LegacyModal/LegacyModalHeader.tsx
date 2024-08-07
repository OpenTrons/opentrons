import * as React from 'react'
import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  Btn,
  COLORS,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { Divider } from '../../atoms/structure'
import type { IconProps } from '@opentrons/components'

export interface LegacyModalHeaderProps {
  onClose?: React.MouseEventHandler
  title: React.ReactNode
  titleElement1?: JSX.Element
  titleElement2?: JSX.Element
  backgroundColor?: string
  color?: string
  icon?: IconProps
  closeButton?: React.ReactNode
}

const closeIconStyles = css`
  display: flex;
  justify-content: ${JUSTIFY_CENTER};
  align-items: ${ALIGN_CENTER};
  border-radius: 0.875rem;
  width: 1.625rem;
  height: 1.625rem;
  &:hover {
    background-color: ${COLORS.grey30};
  }

  &:active {
    background-color: ${COLORS.grey35};
  }
`

export const LegacyModalHeader = (
  props: LegacyModalHeaderProps
): JSX.Element => {
  const {
    icon,
    onClose,
    title,
    titleElement1,
    titleElement2,
    backgroundColor,
    color,
    closeButton,
  } = props
  return (
    <>
      <Flex
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        paddingX={SPACING.spacing24}
        paddingY={SPACING.spacing16}
        backgroundColor={backgroundColor}
        data-testid="Modal_header"
      >
        <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
          {icon != null && <Icon {...icon} data-testid="Modal_header_icon" />}
          {titleElement1}
          {titleElement2}
          {/* TODO (nd: 08/07/2024) Convert to StyledText once designs are resolved */}
          <LegacyStyledText
            as="h3"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            color={color}
          >
            {title}
          </LegacyStyledText>
        </Flex>
        {closeButton != null
          ? closeButton
          : onClose != null && (
              <Btn
                onClick={onClose}
                css={closeIconStyles}
                data-testid={`ModalHeader_icon_close${
                  typeof title === 'string' ? `_${title}` : ''
                }`}
              >
                <Icon
                  name="close"
                  width={SPACING.spacing24}
                  height={SPACING.spacing24}
                  color={color}
                />
              </Btn>
            )}
      </Flex>
      <Divider width="100%" marginY="0" />
    </>
  )
}
