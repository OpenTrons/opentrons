import * as React from 'react'
import {
  COLORS,
  TYPOGRAPHY,
  Tooltip as SharedTooltip,
} from '@opentrons/components'
import type { UseTooltipResultTooltipProps } from '@opentrons/components'

export interface TooltipProps {
  children: React.ReactNode
  tooltipProps: UseTooltipResultTooltipProps & { visible: boolean }
  key?: string
}

export function Tooltip(props: TooltipProps): JSX.Element {
  const { key, children, tooltipProps } = props

  return (
    <SharedTooltip
      {...tooltipProps}
      backgroundColor={COLORS.darkBlack}
      key={key}
      fontSize={TYPOGRAPHY.fontSizeCaption}
      width={'8.75rem'}
    >
      {children}
    </SharedTooltip>
  )
}
