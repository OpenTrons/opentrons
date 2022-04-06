import * as React from 'react'
import { Flex, POSITION_ABSOLUTE } from '..'

export interface OverlayProps {
  /** optional onClick handler */
  onClick?: React.MouseEventHandler
  alertOverlay?: boolean | null
  backgroundColor?: string
}

export function Overlay(props: OverlayProps): JSX.Element {
  const {
    alertOverlay,
    backgroundColor = 'rgba(0, 0, 0, 0.9)',
    onClick,
  } = props

  const alertOverlayBackgroundColor = 'rgba(115, 115, 115, 0.9)'

  return (
    <Flex
      position={POSITION_ABSOLUTE}
      left="0"
      right="0"
      top="0"
      bottom="0"
      zIndex="1"
      backgroundColor={
        alertOverlay != null && alertOverlay
          ? alertOverlayBackgroundColor
          : backgroundColor
      }
      onClick={onClick}
    />
  )
}
