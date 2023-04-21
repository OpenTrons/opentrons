import * as React from 'react'

import {
  Box,
  Flex,
  StyleProps,
  COLORS,
  SPACING,
  POSITION_FIXED,
  POSITION_ABSOLUTE,
  ALIGN_CENTER,
  JUSTIFY_CENTER,
  POSITION_RELATIVE,
  OVERFLOW_AUTO,
  POSITION_STICKY,
  BORDERS,
} from '@opentrons/components'

const BASE_STYLE = {
  position: POSITION_ABSOLUTE,
  alignItems: ALIGN_CENTER,
  justifyContent: JUSTIFY_CENTER,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: '100%',
  height: '100%',
} as const

const MODAL_STYLE = {
  backgroundColor: COLORS.white,
  position: POSITION_RELATIVE,
  overflowY: OVERFLOW_AUTO,
  maxHeight: '100%',
  width: '100%',
  margin: SPACING.spacing5,
  borderRadius: BORDERS.radiusSoftCorners,
  boxShadow: BORDERS.smallDropShadow,
} as const

const FULL_PAGE_STYLE = {
  overflowY: OVERFLOW_AUTO,
  height: '100%',
  width: '100%',
} as const

const HEADER_STYLE = {
  backgroundColor: COLORS.white,
  position: POSITION_STICKY,
  top: 0,
} as const

const FOOTER_STYLE = {
  backgroundColor: COLORS.white,
  position: POSITION_STICKY,
  bottom: 0,
  boxShadow: '0px 3px 6px 0px #0000003B',
} as const

export interface ModalShellProps extends StyleProps {
  /** Modal content */
  children: React.ReactNode
  /** Optional close on outside click **/
  onOutsideClick?: React.MouseEventHandler
  /** Optional sticky header */
  header?: React.ReactNode
  /** Optional sticky footer */
  footer?: React.ReactNode
  /** Optional full page takeover */
  fullPage?: boolean
  /** For on device display */
  isOnDeviceDisplay?: boolean
}

/**
 * A ModalShell is a layout component for building more specific modals.
 *
 * It includes:
 * - An overlay
 * - A content area, with `overflow-y: auto` and customizable with style props
 * - An optional sticky header
 * - An optional sticky footer
 * - An optional onOutsideClick function
 */
export function ModalShell(props: ModalShellProps): JSX.Element {
  const {
    onOutsideClick,
    zIndex = 10,
    header,
    footer,
    fullPage = false,
    children,
    isOnDeviceDisplay = false,
    ...styleProps
  } = props

  return (
    <Flex
      position={POSITION_FIXED}
      left="0"
      right="0"
      top="0"
      bottom="0"
      aria-label="BackgroundOverlay_ModalShell"
      zIndex="1"
      backgroundColor={
        isOnDeviceDisplay ? COLORS.darkBlack_sixty : COLORS.backgroundOverlay
      }
      cursor="default"
      onClick={e => {
        e.stopPropagation()
        if (onOutsideClick != null) onOutsideClick(e)
      }}
    >
      <Flex {...BASE_STYLE} zIndex={zIndex}>
        <Box
          {...(fullPage ? FULL_PAGE_STYLE : MODAL_STYLE)}
          // apply background color style prop only to full page - omitting width, margin, etc
          {...(fullPage
            ? { backgroundColor: styleProps.backgroundColor ?? COLORS.white }
            : styleProps)}
          onClick={e => {
            e.stopPropagation()
          }}
        >
          {header != null ? <Box {...HEADER_STYLE}>{header}</Box> : null}
          {children}
          {footer != null ? <Box {...FOOTER_STYLE}>{footer}</Box> : null}
        </Box>
      </Flex>
    </Flex>
  )
}
