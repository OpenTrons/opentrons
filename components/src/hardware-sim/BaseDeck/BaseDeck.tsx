import { Fragment } from 'react'
import {
  getDeckDefFromRobotType,
  getModuleDef2,
  getPositionFromSlotId,
  inferModuleOrientationFromXCoordinate,
  OT2_ROBOT_TYPE,
  MOVABLE_TRASH_CUTOUTS,
  SINGLE_SLOT_FIXTURES,
  STAGING_AREA_CUTOUTS,
  STAGING_AREA_RIGHT_SLOT_FIXTURE,
  TRASH_BIN_ADAPTER_FIXTURE,
  WASTE_CHUTE_CUTOUT,
  WASTE_CHUTE_ONLY_FIXTURES,
  WASTE_CHUTE_STAGING_AREA_FIXTURES,
  HEATERSHAKER_MODULE_V1,
  MODULE_FIXTURES_BY_MODEL,
  STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE,
} from '@opentrons/shared-data'

import { DeckInfoLabel } from '../../molecules/DeckInfoLabel'
import { RobotCoordinateSpace } from '../RobotCoordinateSpace'
import { Module } from '../Module'
import { LabwareRender } from '../Labware'
import { FlexTrash } from '../Deck/FlexTrash'
import { DeckFromLayers } from '../Deck/DeckFromLayers'
import { RobotCoordsForeignObject } from '../Deck/RobotCoordsForeignObject'
import { SlotLabels } from '../Deck'
import { COLORS } from '../../helix-design-system'

import { SingleSlotFixture } from './SingleSlotFixture'
import { StagingAreaFixture } from './StagingAreaFixture'
import { WasteChuteFixture } from './WasteChuteFixture'
import { WasteChuteStagingAreaFixture } from './WasteChuteStagingAreaFixture'

import type { ComponentProps, ReactNode } from 'react'
import type { Svg } from '../../primitives'
import type {
  CutoutFixtureId,
  DeckConfiguration,
  LabwareDefinition2,
  LabwareLocation,
  ModuleLocation,
  ModuleModel,
  RobotType,
} from '@opentrons/shared-data'
import type { TrashCutoutId } from '../Deck/FlexTrash'
import type { StagingAreaLocation } from './StagingAreaFixture'
import type { WellFill, WellGroup } from '../Labware'
import { SceneWithSVGPath } from '../../organisms/ProtocolTimelineScrubber/threeJsTest'

export interface LabwareOnDeck {
  labwareLocation: LabwareLocation
  definition: LabwareDefinition2
  wellFill?: WellFill
  missingTips?: WellGroup
  /** generic prop to render self-positioned children for each labware */
  labwareChildren?: ReactNode
  onLabwareClick?: () => void
  highlight?: boolean
  highlightShadow?: boolean
  stacked?: boolean
}

export interface ModuleOnDeck {
  moduleModel: ModuleModel
  moduleLocation: ModuleLocation
  nestedLabwareDef?: LabwareDefinition2 | null
  nestedLabwareWellFill?: WellFill
  innerProps?: ComponentProps<typeof Module>['innerProps']
  /** generic prop to render self-positioned children for each module */
  moduleChildren?: ReactNode
  onLabwareClick?: () => void
  highlightLabware?: boolean
  highlightShadowLabware?: boolean
  stacked?: boolean
}
interface BaseDeckProps {
  deckConfig: DeckConfiguration
  robotType: RobotType
  labwareOnDeck?: LabwareOnDeck[]
  modulesOnDeck?: ModuleOnDeck[]
  deckLayerBlocklist?: string[]
  showExpansion?: boolean
  lightFill?: string
  mediumFill?: string
  darkFill?: string
  children?: ReactNode
  showSlotLabels?: boolean
  /** whether to make wrapping svg tag animatable via @react-spring/web, defaults to false */
  animatedSVG?: boolean
  /** extra props to pass to svg tag */
  svgProps?: ComponentProps<typeof Svg>
}

const LABWARE_OFFSET_DISPLAY_THRESHOLD = 2

export function BaseDeck(props: BaseDeckProps): JSX.Element {
  const {
    robotType,
    modulesOnDeck = [],
    labwareOnDeck = [],
    lightFill = COLORS.grey30,
    mediumFill = COLORS.grey50,
    darkFill = COLORS.grey60,
    deckLayerBlocklist = [],
    deckConfig,
    showExpansion = true,
    children,
    showSlotLabels = true,
    animatedSVG = false,
    svgProps = {},
  } = props
  const deckDef = getDeckDefFromRobotType(robotType)

  const singleSlotFixtures = deckConfig.filter(
    fixture =>
      fixture.cutoutFixtureId != null &&
      (SINGLE_SLOT_FIXTURES.includes(fixture.cutoutFixtureId) ||
        // If module fixture is loaded, still visualize singleSlotFixture underneath for consistency
        Object.entries(MODULE_FIXTURES_BY_MODEL)
          .reduce<CutoutFixtureId[]>(
            (acc, [_model, fixtures]) => [...acc, ...fixtures],
            []
          )
          .includes(fixture.cutoutFixtureId))
  )
  const stagingAreaFixtures = deckConfig.filter(
    fixture =>
      (fixture.cutoutFixtureId === STAGING_AREA_RIGHT_SLOT_FIXTURE ||
        fixture.cutoutFixtureId ===
          STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE) &&
      STAGING_AREA_CUTOUTS.includes(fixture.cutoutId)
  )
  const trashBinFixtures = deckConfig.filter(
    fixture =>
      fixture.cutoutFixtureId === TRASH_BIN_ADAPTER_FIXTURE &&
      MOVABLE_TRASH_CUTOUTS.includes(fixture.cutoutId)
  )
  const wasteChuteOnlyFixtures = deckConfig.filter(
    fixture =>
      fixture.cutoutFixtureId != null &&
      WASTE_CHUTE_ONLY_FIXTURES.includes(fixture.cutoutFixtureId) &&
      fixture.cutoutId === WASTE_CHUTE_CUTOUT
  )
  const wasteChuteStagingAreaFixtures = deckConfig.filter(
    fixture =>
      fixture.cutoutFixtureId != null &&
      WASTE_CHUTE_STAGING_AREA_FIXTURES.includes(fixture.cutoutFixtureId) &&
      fixture.cutoutId === WASTE_CHUTE_CUTOUT
  )

  return (
    <RobotCoordinateSpace
      viewBox={`${deckDef.cornerOffsetFromOrigin[0]} ${deckDef.cornerOffsetFromOrigin[1]} ${deckDef.dimensions[0]} ${deckDef.dimensions[1]}`}
      {...svgProps}
    >
      {robotType === OT2_ROBOT_TYPE ? (
        <>
          <SceneWithSVGPath />
          {/* <DeckFromLayers
          robotType={robotType}
          layerBlocklist={deckLayerBlocklist}
        /> */}
        </>
      ) : (
        <>
          {singleSlotFixtures.map(fixture => (
            <SingleSlotFixture
              key={fixture.cutoutId}
              cutoutId={fixture.cutoutId}
              deckDefinition={deckDef}
              slotClipColor={darkFill}
              fixtureBaseColor={lightFill}
              showExpansion={showExpansion}
            />
          ))}
        </>
      )}
      {children}
    </RobotCoordinateSpace>
  )
}

function StackedBadge(): JSX.Element {
  return (
    <RobotCoordsForeignObject height="2.5rem" width="2.5rem" x={113} y={53}>
      <DeckInfoLabel
        height="1.25rem"
        svgSize="0.875rem"
        highlight
        iconName="stacked"
      />
    </RobotCoordsForeignObject>
  )
}
