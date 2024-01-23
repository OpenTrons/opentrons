import * as React from 'react'
import { css } from 'styled-components'

import { Icon } from '../../icons'
import { Btn } from '../../primitives'
import { ALIGN_CENTER, DISPLAY_FLEX, JUSTIFY_CENTER } from '../../styles'
import { BORDERS } from '../../ui-style-constants'
import { COLORS } from '../../helix-design-system'
import { RobotCoordsForeignObject } from '../Deck/RobotCoordsForeignObject'
import {
  COLUMN_1_X_ADJUSTMENT,
  COLUMN_3_X_ADJUSTMENT,
  FIXTURE_HEIGHT,
  SINGLE_SLOT_FIXTURE_WIDTH,
  Y_ADJUSTMENT,
} from './constants'

import type { CutoutId, DeckDefinition } from '@opentrons/shared-data'

interface EmptyConfigFixtureProps {
  deckDefinition: DeckDefinition
  fixtureLocation: CutoutId
  handleClickAdd: (fixtureLocation: CutoutId) => void
}

export function EmptyConfigFixture(
  props: EmptyConfigFixtureProps
): JSX.Element {
  const { deckDefinition, handleClickAdd, fixtureLocation } = props

  const standardSlotCutout = deckDefinition.locations.cutouts.find(
    cutout => cutout.id === fixtureLocation
  )

  /**
   * deck definition cutout position is the position of the single slot located within that cutout
   * so, to get the position of the cutout itself we must add an adjustment to the slot position
   * the adjustment for x is different for right side/left side
   */
  const [xSlotPosition = 0, ySlotPosition = 0] =
    standardSlotCutout?.position ?? []

  const isColumnOne =
    fixtureLocation === 'cutoutA1' ||
    fixtureLocation === 'cutoutB1' ||
    fixtureLocation === 'cutoutC1' ||
    fixtureLocation === 'cutoutD1'
  const xAdjustment = isColumnOne
    ? COLUMN_1_X_ADJUSTMENT
    : COLUMN_3_X_ADJUSTMENT
  const x = xSlotPosition + xAdjustment

  const y = ySlotPosition + Y_ADJUSTMENT

  return (
    <RobotCoordsForeignObject
      width={SINGLE_SLOT_FIXTURE_WIDTH}
      height={FIXTURE_HEIGHT}
      x={x}
      y={y}
      flexProps={{ flex: '1' }}
      foreignObjectProps={{ flex: '1' }}
    >
      <Btn
        css={EMPTY_CONFIG_STYLE}
        onClick={() => handleClickAdd(fixtureLocation)}
      >
        <Icon name="add" color={COLORS.blue50} size="2rem" />
      </Btn>
    </RobotCoordsForeignObject>
  )
}

const EMPTY_CONFIG_STYLE = css`
  display: ${DISPLAY_FLEX};
  align-items: ${ALIGN_CENTER};
  justify-content: ${JUSTIFY_CENTER};
  background-color: ${COLORS.blue35};
  border: 3px dashed ${COLORS.blue50};
  border-radius: ${BORDERS.radiusSoftCorners};
  width: 100%;

  &:active {
    border: 3px solid ${COLORS.blue50};
    background-color: ${COLORS.blue40};
  }

  &:focus {
    border: 3px solid ${COLORS.blue50};
    background-color: ${COLORS.blue40};
  }

  &:hover {
    background-color: ${COLORS.blue40};
  }

  &:focus-visible {
    border: 3px solid ${COLORS.blue50};
  }
`
