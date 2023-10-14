import * as React from 'react'

import { COLORS } from '../../ui-style-constants'
import { SlotBase } from './SlotBase'
import { SlotClip } from './SlotClip'
import { WasteChute } from './WasteChuteFixture'

import type { DeckDefinition, ModuleType } from '@opentrons/shared-data'
import type { WasteChuteLocation } from './WasteChuteFixture'

interface WasteChuteStagingAreaFixtureProps
  extends React.SVGProps<SVGGElement> {
  cutoutLocation: WasteChuteLocation
  deckDefinition: DeckDefinition
  moduleType?: ModuleType
  fixtureBaseColor?: React.SVGProps<SVGPathElement>['fill']
  slotClipColor?: React.SVGProps<SVGPathElement>['stroke']
  showExtensions?: boolean
}

export function WasteChuteStagingAreaFixture(
  props: WasteChuteStagingAreaFixtureProps
): JSX.Element | null {
  const {
    cutoutLocation,
    deckDefinition,
    fixtureBaseColor = COLORS.light1,
    slotClipColor = COLORS.darkGreyEnabled,
    ...restProps
  } = props

  if (cutoutLocation !== 'D3') {
    console.warn(
      `cannot render WasteChuteStagingAreaFixture in given cutout location ${cutoutLocation}`
    )
    return null
  }

  // TODO(bh, 2023-10-09): migrate from "orderedSlots" to v4 "cutouts" key
  const cutoutDef = deckDefinition?.locations.orderedSlots.find(
    s => s.id === cutoutLocation
  )
  if (cutoutDef == null) {
    console.warn(
      `cannot render WasteChuteStagingAreaFixture, no cutout named: ${cutoutDef} in deck def ${deckDefinition?.otId}`
    )
    return null
  }

  // TODO(bh, 2023-10-10): adjust base and clip d values if needed to fit v4 deck definition
  return (
    // TODO: render a "Waste chute" foreign object similar to FlexTrash
    <g {...restProps}>
      <SlotBase
        d="M314.8,96.1h329.9c2.4,0,4.3-1.9,4.3-4.3V-5.6c0-2.4-1.9-4.3-4.3-4.3H314.8c-2.4,0-4.3,1.9-4.3,4.3v97.4C310.5,94.2,312.4,96.1,314.8,96.1z"
        fill={fixtureBaseColor}
      />
      <SlotClip d="M488,77.9v10.1h10.8" stroke={slotClipColor} />,
      <SlotClip d="M488,8.8v-10.5h10.6" stroke={slotClipColor} />,
      <SlotClip d="M619.8,77.9v10.1H609" stroke={slotClipColor} />,
      <SlotClip d="M619.8,8.8v-10.7H609" stroke={slotClipColor} />
      <WasteChute
        wasteIconColor={fixtureBaseColor}
        backgroundColor={slotClipColor}
      />
    </g>
  )
}
