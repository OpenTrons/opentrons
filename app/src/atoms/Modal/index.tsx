import * as React from 'react'

import {
  Btn,
  Icon,
  BaseModal,
  BaseModalProps,
  TYPOGRAPHY,
  Flex,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  COLORS,
} from '@opentrons/components'

import { StyledText } from '../text'
import { Divider } from '../structure'
import type { IconProps } from '@opentrons/components'

type ModalType = 'info' | 'warning' | 'error'
interface ModalProps extends BaseModalProps {
  type?: ModalType
  onClose?: React.MouseEventHandler
  title?: React.ReactNode
  children?: React.ReactNode
  icon?: IconProps
}

export const Modal = (props: ModalProps): JSX.Element => {
  const { type = 'info', onClose, title, children } = props
  const header =
    title != null ? (
      <>
        <Flex
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          paddingX={SPACING.spacing5}
          paddingY={SPACING.spacing4}
        >
          <Flex>
            {['error', 'warning'].includes(type) ? (
              <Icon
                name="alert-circle"
                color={type === 'error' ? COLORS.error : COLORS.warning}
                size={SPACING.spacingM}
                marginRight={SPACING.spacing3}
              />
            ) : null}
            <StyledText as="h3" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
              {title}
            </StyledText>
          </Flex>
          {onClose != null && (
            <Btn onClick={onClose}>
              <Icon
                name={'close'}
                width={SPACING.spacing5}
                height={SPACING.spacing5}
              />
            </Btn>
          )}
        </Flex>
        <Divider width="100%" marginY="0" />
      </>
    ) : null

  return (
    <BaseModal width={'31.25rem'} noHeaderStyles header={header}>
      {children}
    </BaseModal>
  )
}
