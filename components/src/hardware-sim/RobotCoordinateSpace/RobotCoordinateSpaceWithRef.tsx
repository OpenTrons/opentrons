import { useRef } from 'react'
import { Svg } from '../../primitives'

import type { ComponentProps, ReactNode } from 'react'
import type { DeckDefinition, DeckSlot } from '@opentrons/shared-data'

export interface RobotCoordinateSpaceWithRefRenderProps {
  deckSlotsById: { [slotId: string]: DeckSlot }
}

interface RobotCoordinateSpaceWithRefProps extends ComponentProps<typeof Svg> {
  viewBox?: string | null
  deckDef?: DeckDefinition
  children?: (props: RobotCoordinateSpaceWithRefRenderProps) => ReactNode
}

export function RobotCoordinateSpaceWithRef(
  props: RobotCoordinateSpaceWithRefProps
): JSX.Element | null {
  const { children, deckDef, viewBox, ...restProps } = props
  const wrapperRef = useRef<SVGSVGElement>(null)

  if (deckDef == null && viewBox == null) return null

  let wholeDeckViewBox
  let deckSlotsById = {}
  if (deckDef != null) {
    const [viewBoxOriginX, viewBoxOriginY] = deckDef.cornerOffsetFromOrigin
    const [deckXDimension, deckYDimension] = deckDef.dimensions

    deckSlotsById = deckDef.locations.addressableAreas.reduce(
      (acc, deckSlot) => ({ ...acc, [deckSlot.id]: deckSlot }),
      {}
    )
    wholeDeckViewBox = `${viewBoxOriginX} ${viewBoxOriginY} ${deckXDimension} ${deckYDimension}`
  }

  return (
    <Svg
      viewBox={viewBox != null ? viewBox : wholeDeckViewBox}
      ref={wrapperRef}
      transform="scale(1, -1)"
      width="100%"
      height="100%"
      {...restProps}
    >
      {children?.({ deckSlotsById })}
    </Svg>
  )
}
