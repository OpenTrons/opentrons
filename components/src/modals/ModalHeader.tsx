import styled, { css } from 'styled-components'

import { Icon } from '../icons'
import { Box, Btn, Flex } from '../primitives'
import { StyledText } from '../atoms'
import {
  ALIGN_CENTER,
  DISPLAY_FLEX,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
} from '../styles'
import { SPACING } from '../ui-style-constants'
import { COLORS } from '../helix-design-system'

import type { MouseEventHandler, ReactNode } from 'react'
import type { IconProps } from '../icons'

export interface ModalHeaderProps {
  title: ReactNode
  onClose?: MouseEventHandler
  titleElement1?: JSX.Element
  titleElement2?: JSX.Element
  tagElement?: JSX.Element
  backgroundColor?: string
  color?: string
  icon?: IconProps
  closeButton?: ReactNode
}

export const ModalHeader = (props: ModalHeaderProps): JSX.Element => {
  const {
    icon,
    onClose,
    title,
    titleElement1,
    titleElement2,
    backgroundColor,
    tagElement,
    color = COLORS.black90,
    closeButton,
  } = props
  return (
    <>
      <StyledModalHeader
        backgroundColor={backgroundColor}
        data-testid="Modal_header"
        role="heading"
      >
        <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing16}>
          {icon != null && <Icon {...icon} data-testid="Modal_header_icon" />}
          {titleElement1}
          {titleElement2}
          <StyledText color={color} desktopStyle="bodyLargeSemiBold">
            {title}
          </StyledText>
        </Flex>
        <Flex gridGap={SPACING.spacing4}>
          {tagElement}
          {closeButton != null ||
            (onClose != null && (
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
            ))}
        </Flex>
      </StyledModalHeader>
      <StyledDivider data-testid="divider" />
    </>
  )
}

const StyledModalHeader = styled(Flex)`
  padding: ${SPACING.spacing16} ${SPACING.spacing24};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
  background-color: ${props => props.backgroundColor};
`

const StyledDivider = styled(Box)`
  border-bottom: 1px solid ${COLORS.grey30};
  margin: 0;
  width: 100%;
`

const closeIconStyles = css`
  display: ${DISPLAY_FLEX};
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
