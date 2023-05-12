import * as React from 'react'
import { SPACING, COLORS, Box } from '@opentrons/components'
import { ModalHeader } from './ModalHeader'
import { ModalShell } from './ModalShell'
import type { StyleProps } from '@opentrons/components'

type ModalType = 'info' | 'warning' | 'error'
export * from './ModalShell'
export * from './ModalHeader'

export interface ModalProps extends StyleProps {
  type?: ModalType
  onClose?: React.MouseEventHandler
  closeOnOutsideClick?: boolean
  title?: React.ReactNode
  fullPage?: boolean
  childrenPadding?: string | number
  children?: React.ReactNode
}

export const Modal = (props: ModalProps): JSX.Element => {
  const {
    type = 'info',
    onClose,
    closeOnOutsideClick,
    title,
    childrenPadding = `${SPACING.spacing16} ${SPACING.spacing24} ${SPACING.spacing24}`,
    children,
    ...styleProps
  } = props

  const modalHeader = (
    <ModalHeader
      onClose={onClose}
      title={title}
      icon={
        ['error', 'warning'].includes(type)
          ? {
              name: 'ot-alert',
              color:
                type === 'error' ? COLORS.errorEnabled : COLORS.warningEnabled,
              size: SPACING.spacing20,
              marginRight: SPACING.spacing8,
            }
          : undefined
      }
    />
  )

  return (
    <ModalShell
      width={styleProps.width ?? '31.25rem'}
      header={modalHeader}
      onOutsideClick={closeOnOutsideClick ?? false ? onClose : undefined}
      // center within viewport aside from nav
      marginLeft="7.125rem"
      {...props}
    >
      <Box padding={childrenPadding}>{children}</Box>
    </ModalShell>
  )
}
