import { useMemo, useState, Fragment } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DeckFromLayers,
  DIRECTION_COLUMN,
  Flex,
  FlexTrash,
  JUSTIFY_CENTER,
  RobotCoordinateSpaceWithRef,
  SingleSlotFixture,
  SlotLabels,
  SPACING,
  StagingAreaFixture,
  WasteChuteFixture,
  WasteChuteStagingAreaFixture,
} from '@opentrons/components'
import {
  getDeckDefFromRobotType,
  getPositionFromSlotId,
  isAddressableAreaStandardSlot,
  OT2_ROBOT_TYPE,
  STAGING_AREA_CUTOUTS,
  TRASH_BIN_ADAPTER_FIXTURE,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'

import {
  darkFill,
  lightFill,
  OT2_STANDARD_DECK_VIEW_LAYER_BLOCK_LIST,
} from '../../../components/atoms'
import { getDeckSetupForActiveItem } from '../../../top-selectors/labware-locations'
import { getDisableModuleRestrictions } from '../../../feature-flags/selectors'
import { getRobotType } from '../../../file-data/selectors'
import { getHasGen1MultiChannelPipette } from '../../../step-forms'
import { selectZoomedIntoSlot } from '../../../labware-ingred/actions'
import { selectors } from '../../../labware-ingred/selectors'
import { DeckSetupDetails } from '../../../pages/Designer/DeckSetup/DeckSetupDetails'
import { DeckSetupTools } from '../../../pages/Designer/DeckSetup/DeckSetupTools'
import {
  animateZoom,
  getCutoutIdForAddressableArea,
  useDeckSetupWindowBreakPoint,
  zoomInOnCoordinate,
} from '../../../pages/Designer/DeckSetup/utils'
import { HoverSlotDetailsContainer } from '../../../pages/Designer/DeckSetup/HoverSlotDetailsContainer'

import type { StagingAreaLocation, TrashCutoutId } from '@opentrons/components'
import type {
  AddressableAreaName,
  CutoutId,
  ModuleModel,
} from '@opentrons/shared-data'
import type {
  AdditionalEquipmentEntity,
  DeckSlot,
} from '@opentrons/step-generation'
import type { Fixture } from '../../../pages/Designer/DeckSetup/constants'

export function StartingDeckContainer(): JSX.Element {
  const activeDeckSetup = useSelector(getDeckSetupForActiveItem)
  const dispatch = useDispatch<any>()
  const breakPointSize = useDeckSetupWindowBreakPoint()
  const zoomIn = useSelector(selectors.getZoomedInSlot)
  const _disableCollisionWarnings = useSelector(getDisableModuleRestrictions)
  const robotType = useSelector(getRobotType)
  const deckDef = useMemo(() => getDeckDefFromRobotType(robotType), [robotType])
  const [hoverSlot, setHoverSlot] = useState<DeckSlot | null>(null)
  const [hoveredLabware, setHoveredLabware] = useState<string | null>(null)
  const [hoveredModule, setHoveredModule] = useState<ModuleModel | null>(null)
  const [hoveredFixture, setHoveredFixture] = useState<Fixture | null>(null)
  const trash = Object.values(activeDeckSetup.additionalEquipmentOnDeck).find(
    ae => ae.name === 'trashBin'
  )
  const wasteChuteFixtures = Object.values(
    activeDeckSetup.additionalEquipmentOnDeck
  ).filter(
    aE =>
      WASTE_CHUTE_CUTOUT.includes(aE.location as CutoutId) &&
      aE.name === 'wasteChute'
  )
  const wasteChuteStagingAreaFixtures = Object.values(
    activeDeckSetup.additionalEquipmentOnDeck
  ).filter(
    aE =>
      STAGING_AREA_CUTOUTS.includes(aE.location as CutoutId) &&
      aE.name === 'stagingArea' &&
      aE.location === WASTE_CHUTE_CUTOUT &&
      wasteChuteFixtures.length > 0
  )

  const [viewBoxX, viewBoxY] = deckDef.cornerOffsetFromOrigin
  const [viewBoxWidth, viewBoxHeight] = deckDef.dimensions
  const initialViewBox = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`

  const [viewBox, setViewBox] = useState<string>(initialViewBox)

  const isZoomed = Object.values(zoomIn).some(val => val != null)

  const addEquipment = (slotId: string): void => {
    const cutoutId =
      getCutoutIdForAddressableArea(
        slotId as AddressableAreaName,
        deckDef.cutoutFixtures
      ) ?? null
    if (cutoutId == null) {
      console.error('expected to find a cutoutId but could not')
    }
    dispatch(selectZoomedIntoSlot({ slot: slotId, cutout: cutoutId }))

    const zoomInSlotPosition = getPositionFromSlotId(slotId ?? '', deckDef)
    if (zoomInSlotPosition != null) {
      const zoomedInViewBox = zoomInOnCoordinate({
        x: zoomInSlotPosition[0],
        y: zoomInSlotPosition[1],

        deckDef,
      })
      //  TODO(ja, 9/3/24): re-examine this usage. It is causing
      //  a handful of rerendering of the DeckSetupTools which may
      //  cause optimization issues??
      animateZoom({
        targetViewBox: zoomedInViewBox,
        viewBox,
        setViewBox,
      })
    }
  }

  const _hasGen1MultichannelPipette = useMemo(
    () => getHasGen1MultiChannelPipette(activeDeckSetup.pipettes),
    [activeDeckSetup.pipettes]
  )
  const showGen1MultichannelCollisionWarnings =
    !_disableCollisionWarnings && _hasGen1MultichannelPipette

  const trashBinFixtures = [
    {
      cutoutId: trash?.location as CutoutId,
      cutoutFixtureId: TRASH_BIN_ADAPTER_FIXTURE,
    },
  ]
  const stagingAreaFixtures: AdditionalEquipmentEntity[] = Object.values(
    activeDeckSetup.additionalEquipmentOnDeck
  ).filter(
    aE =>
      STAGING_AREA_CUTOUTS.includes(aE.location as CutoutId) &&
      aE.name === 'stagingArea'
  )

  const filteredAddressableAreas = deckDef.locations.addressableAreas.filter(
    aa => isAddressableAreaStandardSlot(aa.id, deckDef)
  )

  let containerPadding = '0'
  if (!isZoomed) {
    containerPadding = SPACING.spacing40
  }

  return (
    <>
      <Flex
        backgroundColor={COLORS.white}
        borderRadius={BORDERS.borderRadius12}
        width="100%"
        height="100%"
        flexDirection={DIRECTION_COLUMN}
        padding={containerPadding}
        justifyContent={JUSTIFY_CENTER}
        position="relative"
        maxHeight="auto"
      >
        <Flex
          width="100%"
          height="100%"
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_CENTER}
          gridGap={SPACING.spacing12}
        >
          <Flex
            width="100%"
            height="100%"
            alignItems={ALIGN_CENTER}
            justifyContent={JUSTIFY_CENTER}
            position="relative"
          >
            {/* Overlay Slot Details Container */}
            {hoverSlot !== null && breakPointSize !== 'small' ? (
              <HoverSlotDetailsContainer
                hoverSlot={hoverSlot}
                robotType={robotType}
              />
            ) : null}

            <RobotCoordinateSpaceWithRef
              height="100%"
              width={zoomIn.slot != null ? '100%' : '50%'}
              deckDef={deckDef}
              viewBox={viewBox}
              outline="auto"
              zoomed={zoomIn.slot != null}
              borderRadius={BORDERS.borderRadius12}
            >
              {() => (
                <>
                  {robotType === OT2_ROBOT_TYPE ? (
                    <DeckFromLayers
                      robotType={robotType}
                      layerBlocklist={OT2_STANDARD_DECK_VIEW_LAYER_BLOCK_LIST}
                    />
                  ) : (
                    <>
                      {filteredAddressableAreas.map(addressableArea => {
                        const cutoutId = getCutoutIdForAddressableArea(
                          addressableArea.id,
                          deckDef.cutoutFixtures
                        )
                        return cutoutId != null ? (
                          <SingleSlotFixture
                            key={addressableArea.id}
                            cutoutId={cutoutId}
                            deckDefinition={deckDef}
                            slotClipColor={darkFill}
                            showExpansion={cutoutId === 'cutoutA1'}
                            fixtureBaseColor={lightFill}
                          />
                        ) : null
                      })}
                      {stagingAreaFixtures.map(fixture => {
                        if (
                          zoomIn.cutout == null ||
                          zoomIn.cutout !== fixture.location
                        ) {
                          return (
                            <StagingAreaFixture
                              key={fixture.id}
                              cutoutId={fixture.location as StagingAreaLocation}
                              deckDefinition={deckDef}
                              slotClipColor={darkFill}
                              fixtureBaseColor={lightFill}
                            />
                          )
                        }
                      })}
                      {trash != null
                        ? trashBinFixtures.map(({ cutoutId }) =>
                            cutoutId != null &&
                            (zoomIn.cutout == null ||
                              zoomIn.cutout !== cutoutId) ? (
                              <Fragment key={cutoutId}>
                                <SingleSlotFixture
                                  cutoutId={cutoutId}
                                  deckDefinition={deckDef}
                                  slotClipColor={COLORS.transparent}
                                  fixtureBaseColor={lightFill}
                                />
                                <FlexTrash
                                  robotType={robotType}
                                  trashIconColor={lightFill}
                                  trashCutoutId={cutoutId as TrashCutoutId}
                                  backgroundColor={COLORS.grey50}
                                />
                              </Fragment>
                            ) : null
                          )
                        : null}
                      {wasteChuteFixtures.map(fixture => {
                        if (
                          zoomIn.cutout == null ||
                          zoomIn.cutout !== fixture.location
                        ) {
                          return (
                            <WasteChuteFixture
                              key={fixture.id}
                              cutoutId={
                                fixture.location as typeof WASTE_CHUTE_CUTOUT
                              }
                              deckDefinition={deckDef}
                              fixtureBaseColor={lightFill}
                            />
                          )
                        }
                      })}
                      {wasteChuteStagingAreaFixtures.map(fixture => {
                        if (
                          zoomIn.cutout == null ||
                          zoomIn.cutout !== fixture.location
                        ) {
                          return (
                            <WasteChuteStagingAreaFixture
                              key={fixture.id}
                              cutoutId={
                                fixture.location as typeof WASTE_CHUTE_CUTOUT
                              }
                              deckDefinition={deckDef}
                              slotClipColor={darkFill}
                              fixtureBaseColor={lightFill}
                            />
                          )
                        }
                      })}
                    </>
                  )}
                  <DeckSetupDetails
                    selectedZoomInSlot={zoomIn.slot ?? undefined}
                    hoveredLabware={hoveredLabware}
                    hoveredModule={hoveredModule}
                    hoveredFixture={hoveredFixture}
                    hover={hoverSlot}
                    tab="startingDeck"
                    setHover={setHoverSlot}
                    addEquipment={addEquipment}
                    activeDeckSetup={activeDeckSetup}
                    stagingAreaCutoutIds={stagingAreaFixtures.map(
                      areas => areas.location as CutoutId
                    )}
                    {...{
                      deckDef,
                      showGen1MultichannelCollisionWarnings,
                    }}
                  />
                  <SlotLabels
                    robotType={robotType}
                    show4thColumn={stagingAreaFixtures.length > 0}
                  />
                </>
              )}
            </RobotCoordinateSpaceWithRef>
          </Flex>
        </Flex>
        {zoomIn.slot != null && zoomIn.cutout != null ? (
          <DeckSetupTools
            onDeckProps={{
              setHoveredFixture,
              setHoveredModule,
            }}
            onCloseClick={() => {
              dispatch(selectZoomedIntoSlot({ slot: null, cutout: null }))
              animateZoom({
                targetViewBox: initialViewBox,
                viewBox,
                setViewBox,
              })
            }}
            setHoveredLabware={setHoveredLabware}
          />
        ) : null}
      </Flex>
    </>
  )
}
