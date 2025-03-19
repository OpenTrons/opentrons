import { useRef } from 'react'
import { Svg } from '../../primitives'

import type { ComponentProps, ReactNode } from 'react'
import type { DeckDefinition, DeckSlot } from '@opentrons/shared-data'

export interface RobotCoordinateSpaceWithRefRenderProps {
  deckSlotsById: { [slotId: string]: DeckSlot }
  //  used for PD's drag/drop DragPreview
  getRobotCoordsFromDOMCoords: (
    domX: number,
    domY: number
  ) => { x: number; y: number }
}

interface RobotCoordinateSpaceWithRefProps extends ComponentProps<typeof Svg> {
  viewBox: string
  deckDef?: DeckDefinition
  children?: (props: RobotCoordinateSpaceWithRefRenderProps) => ReactNode
}

export function RobotCoordinateSpaceWithRef(
  props: RobotCoordinateSpaceWithRefProps
): JSX.Element | null {
  const { children, deckDef, viewBox, ...restProps } = props
  const wrapperRef = useRef<SVGSVGElement>(null)
  if (deckDef == null) return null
  const getRobotCoordsFromDOMCoords: RobotCoordinateSpaceWithRefRenderProps['getRobotCoordsFromDOMCoords'] = (
    x,
    y
  ) => {
    if (wrapperRef.current == null) return { x: 0, y: 0 }

    const cursorPoint = wrapperRef.current.createSVGPoint()

    cursorPoint.x = x
    cursorPoint.y = y

    return cursorPoint.matrixTransform(
      wrapperRef.current.getScreenCTM()?.inverse()
    )
  }

  // let wholeDeckViewBox
  // let deckSlotsById = {}
  // if (deckDef != null) {
  // const [viewBoxOriginX, viewBoxOriginY] = deckDef.cornerOffsetFromOrigin
  // const [deckXDimension, deckYDimension] = deckDef.dimensions

  const deckSlotsById = deckDef.locations.addressableAreas.reduce(
    (acc, deckSlot) => ({ ...acc, [deckSlot.id]: deckSlot }),
    {}
  )
  // wholeDeckViewBox = `${viewBoxOriginX} ${viewBoxOriginY} ${deckXDimension} ${deckYDimension}`
  // }

  return (
    <Svg
      // viewBox={viewBox !== null ? viewBox : wholeDeckViewBox}
      viewBox={viewBox}
      ref={wrapperRef}
      transform="scale(1, -1)"
      width="100%"
      height="100%"
      {...restProps}
    >
      {children?.({ deckSlotsById, getRobotCoordsFromDOMCoords })}
    </Svg>
  )
}
