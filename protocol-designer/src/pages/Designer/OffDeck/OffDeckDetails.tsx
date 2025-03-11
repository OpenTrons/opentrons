import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import {
  ALIGN_CENTER,
  ALIGN_START,
  BORDERS,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  EmptySelectorButton,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_END,
  LabwareRender,
  OVERFLOW_AUTO,
  RobotWorkSpace,
  SPACING,
  StyledText,
} from '@opentrons/components'
import * as wellContentsSelectors from '../../../top-selectors/well-contents'
import { selectors } from '../../../labware-ingred/selectors'
import { getDeckSetupForActiveItem } from '../../../top-selectors/labware-locations'
import { OffDeckControls } from './OffDeckControls'
import { SlotDetailsContainer } from '../../../organisms'
import { wellFillFromWellContents } from '../../../organisms/LabwareOnDeck/utils'
import { getRobotType } from '../../../file-data/selectors'
import {
  getHoveredDropdownItem,
  getSelectedDropdownItem,
} from '../../../ui/steps/selectors'
import { SlotOverflowMenu } from '../DeckSetup/SlotOverflowMenu'
import { HighlightOffdeckSlot } from './HighlightOffdeckSlot'
import type { CoordinateTuple, DeckSlotId } from '@opentrons/shared-data'
import type { DeckSetupTabType } from '../types'

const OFF_DECK_MAP_WIDTH = '41.625rem'
const OFF_DECK_MAP_HEIGHT = '44rem'
const OFF_DECK_MAP_HEIGHT_FOR_STEP = '30.3rem'
const ZERO_SLOT_POSITION: CoordinateTuple = [0, 0, 0]
interface OffDeckDetailsProps extends DeckSetupTabType {
  addLabware: () => void
}
export function OffDeckDetails(props: OffDeckDetailsProps): JSX.Element {
  const { addLabware, tab } = props
  const { t, i18n } = useTranslation('starting_deck_state')
  const [hoverSlot, setHoverSlot] = useState<DeckSlotId | null>(null)
  const [menuListId, setShowMenuListForId] = useState<DeckSlotId | null>(null)
  const robotType = useSelector(getRobotType)
  const deckSetup = useSelector(getDeckSetupForActiveItem)
  const hoveredDropdownItem = useSelector(getHoveredDropdownItem)
  const selectedDropdownSelection = useSelector(getSelectedDropdownItem)
  const offDeckLabware = Object.values(deckSetup.labware).filter(
    lw => lw.slot === 'offDeck'
  )
  const liquidDisplayColors = useSelector(selectors.getLiquidDisplayColors)
  const allWellContentsForActiveItem = useSelector(
    wellContentsSelectors.getAllWellContentsForActiveItem
  )
  const containerWidth = tab === 'startingDeck' ? '100vw' : '75vw'

  const stepDetailsContainerWidth = `calc(((${containerWidth} - ${OFF_DECK_MAP_WIDTH}) / 2) - (${SPACING.spacing24}  * 3))`
  const paddingRight = `calc((100% - ${OFF_DECK_MAP_WIDTH}) / 2)`

  return (
    <Flex
      backgroundColor={COLORS.white}
      borderRadius={BORDERS.borderRadius12}
      width="100%"
      height="100%"
      padding={`${SPACING.spacing40} ${paddingRight} ${SPACING.spacing40} 0`}
      gridGap={SPACING.spacing24}
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_FLEX_END}
    >
      {hoverSlot != null ? (
        <Flex width={stepDetailsContainerWidth} height="6.25rem">
          <SlotDetailsContainer
            robotType={robotType}
            slot="offDeck"
            offDeckLabwareId={hoverSlot}
          />
        </Flex>
      ) : null}
      <Flex
        flex="0 0 auto"
        width={OFF_DECK_MAP_WIDTH}
        height={
          tab === 'startingDeck'
            ? OFF_DECK_MAP_HEIGHT
            : OFF_DECK_MAP_HEIGHT_FOR_STEP
        }
        alignItems={ALIGN_CENTER}
        borderRadius={SPACING.spacing12}
        padding={`${SPACING.spacing16} ${SPACING.spacing40}`}
        backgroundColor={COLORS.grey20}
        overflowY={OVERFLOW_AUTO}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing40}
      >
        <Flex
          justifyContent={JUSTIFY_CENTER}
          width="100%"
          color={COLORS.grey60}
        >
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {i18n.format(t('off_deck_labware'), 'upperCase')}
          </StyledText>
        </Flex>
        <LabwareWrapper>
          {tab === 'startingDeck' ? (
            <Flex width="9.5625rem" height="6.375rem">
              <EmptySelectorButton
                onClick={addLabware}
                text={t('add_labware')}
                textAlignment="middle"
                iconName="plus"
              />
            </Flex>
          ) : null}
          {offDeckLabware.map(lw => {
            const wellContents = allWellContentsForActiveItem
              ? allWellContentsForActiveItem[lw.id]
              : null
            const definition = lw.def
            const { dimensions } = definition
            const xyzDimensions = {
              xDimension: dimensions.xDimension ?? 0,
              yDimension: dimensions.yDimension ?? 0,
              zDimension: dimensions.zDimension ?? 0,
            }
            const isLabwareSelectionSelected = selectedDropdownSelection.some(
              selected => selected.id === lw.id
            )
            const highlighted = hoveredDropdownItem.id === lw.id
            return (
              <Flex
                id={lw.id}
                flexDirection={DIRECTION_COLUMN}
                key={lw.id}
                paddingBottom={
                  isLabwareSelectionSelected || highlighted ? '0px' : '0px'
                }
              >
                <RobotWorkSpace
                  key={lw.id}
                  viewBox={`${definition.cornerOffsetFromSlot.x} ${definition.cornerOffsetFromSlot.y} ${dimensions.xDimension} ${dimensions.yDimension}`}
                  width="9.5625rem"
                  height="6.375rem"
                >
                  {() => (
                    <>
                      <LabwareRender
                        definition={definition}
                        wellFill={wellFillFromWellContents(
                          wellContents,
                          liquidDisplayColors
                        )}
                      />

                      <OffDeckControls
                        hover={hoverSlot}
                        setShowMenuListForId={setShowMenuListForId}
                        menuListId={menuListId}
                        setHover={setHoverSlot}
                        slotBoundingBox={xyzDimensions}
                        slotPosition={ZERO_SLOT_POSITION}
                        labwareId={lw.id}
                        tab={tab}
                      />
                    </>
                  )}
                </RobotWorkSpace>
                <HighlightOffdeckSlot
                  labwareOnDeck={lw}
                  position={ZERO_SLOT_POSITION}
                />
                {menuListId === lw.id ? (
                  <Flex
                    marginTop={`-${SPACING.spacing32}`}
                    marginLeft="4rem"
                    zIndex={3}
                  >
                    <SlotOverflowMenu
                      location={menuListId}
                      addEquipment={addLabware}
                      setShowMenuList={() => {
                        setShowMenuListForId(null)
                      }}
                      menuListSlotPosition={ZERO_SLOT_POSITION}
                      invertY
                    />
                  </Flex>
                ) : null}
              </Flex>
            )
          })}
          <HighlightOffdeckSlot position={ZERO_SLOT_POSITION} />
        </LabwareWrapper>
      </Flex>
    </Flex>
  )
}

const LabwareWrapper = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5625rem, 1fr));
  row-gap: ${SPACING.spacing40};
  column-gap: ${SPACING.spacing32};
  justify-content: ${JUSTIFY_CENTER}; /* Center the grid within the container */
  align-items: ${ALIGN_START};
  width: 100%;
  // Note(kk: 1/30/2025) this padding is to add space to the right edge and the left edge of the grid
  // this is not a perfect solution, but it works for now
  padding: 0 ${SPACING.spacing24};
`
