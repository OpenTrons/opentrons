import * as React from 'react'
import { COLORS, Flex, POSITION_ABSOLUTE } from '..'

export interface OverlayProps {
  /** optional onClick handler */
  onClick?: React.MouseEventHandler
  alertOverlay?: boolean | null | undefined
  backgroundColor?: string
  opacity?: number
}

export function Overlay(props: OverlayProps): JSX.Element {
  const { alertOverlay, onClick } = props

  let backgroundColor: string = COLORS.darkBlack
  if (alertOverlay !== null || alertOverlay !== undefined) {
    backgroundColor = 'rgba(115, 115, 115, 0.9)'
  } else if (props.backgroundColor != null) {
    backgroundColor = props.backgroundColor
  }

  return (
    <Flex
      position={POSITION_ABSOLUTE}
      left="0"
      right="0"
      top="0"
      bottom="0"
      backgroundColor={backgroundColor}
      opacity={props.opacity ?? 0.2}
      onClick={onClick}
    />
  )
}
