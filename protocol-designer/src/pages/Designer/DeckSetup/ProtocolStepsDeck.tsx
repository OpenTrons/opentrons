import { useMemo, Fragment } from 'react'
import { useSelector } from 'react-redux'
import {
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
import { DeckSetupDetails } from './DeckSetupDetails'
import { getCutoutIdForAddressableArea } from './utils'

import type { StagingAreaLocation, TrashCutoutId } from '@opentrons/components'
import type { AddressableAreaName, CutoutId } from '@opentrons/shared-data'
import type { AdditionalEquipmentEntity } from '@opentrons/step-generation'

const DECK_VIEW_CONTAINER_MAX_HEIGHT = '35rem'

export function ProtocolStepsDeck(): JSX.Element {
  const activeDeckSetup = useSelector(getDeckSetupForActiveItem)
  const _disableCollisionWarnings = useSelector(getDisableModuleRestrictions)
  const robotType = useSelector(getRobotType)
  const deckDef = useMemo(() => getDeckDefFromRobotType(robotType), [robotType])
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

  const addEquipment = (slotId: string): void => {
    const cutoutId =
      getCutoutIdForAddressableArea(
        slotId as AddressableAreaName,
        deckDef.cutoutFixtures
      ) ?? null
    if (cutoutId == null) {
      console.error('expected to find a cutoutId but could not')
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

  return (
    <>
      <Flex
        backgroundColor={COLORS.white}
        borderRadius={BORDERS.borderRadius12}
        width="100%"
        height="100%"
        flexDirection={DIRECTION_COLUMN}
        padding={SPACING.spacing60}
        justifyContent={JUSTIFY_CENTER}
        position="relative"
        maxHeight={DECK_VIEW_CONTAINER_MAX_HEIGHT}
      >
        <RobotCoordinateSpaceWithRef
          height="100%"
          width="100%"
          minWidth="auto"
          deckDef={deckDef}
          // viewBox={initialViewBox}
          transform={
            robotType === OT2_ROBOT_TYPE ? 'scale(1.3, -1.3)' : 'scale(1, -1)'
          }
          outline="auto"
          borderRadius={BORDERS.borderRadius12}
        >
          {({ getRobotCoordsFromDOMCoords }) => (
            <>
              {robotType === OT2_ROBOT_TYPE ? (
                <DeckFromLayers
                  robotType={robotType}
                  layerBlocklist={OT2_STANDARD_DECK_VIEW_LAYER_BLOCK_LIST}
                />
              ) : (
                // Note (kk, 03/18/25): this part will be exported as a component in the future
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
                  {stagingAreaFixtures.map(fixture => (
                    <StagingAreaFixture
                      key={fixture.id}
                      cutoutId={fixture.location as StagingAreaLocation}
                      deckDefinition={deckDef}
                      slotClipColor={darkFill}
                      fixtureBaseColor={lightFill}
                    />
                  ))}
                  {trash != null
                    ? trashBinFixtures.map(({ cutoutId }) =>
                        cutoutId != null ? (
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
                  {wasteChuteFixtures.map(fixture => (
                    <WasteChuteFixture
                      key={fixture.id}
                      cutoutId={fixture.location as typeof WASTE_CHUTE_CUTOUT}
                      deckDefinition={deckDef}
                      fixtureBaseColor={lightFill}
                    />
                  ))}
                  {wasteChuteStagingAreaFixtures.map(fixture => (
                    <WasteChuteStagingAreaFixture
                      key={fixture.id}
                      cutoutId={fixture.location as typeof WASTE_CHUTE_CUTOUT}
                      deckDefinition={deckDef}
                      slotClipColor={darkFill}
                      fixtureBaseColor={lightFill}
                    />
                  ))}
                </>
              )}
              <DeckSetupDetails
                getRobotCoordsFromDOMCoords={getRobotCoordsFromDOMCoords}
                tab="protocolSteps"
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
    </>
  )
}
