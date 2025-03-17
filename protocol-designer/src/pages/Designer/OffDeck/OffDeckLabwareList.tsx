import styled from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_START,
  Box,
  DIRECTION_COLUMN,
  EmptySelectorButton,
  Flex,
  JUSTIFY_CENTER,
  LabwareRender,
  RobotWorkSpace,
  SPACING,
} from '@opentrons/components'
import { OffDeckControls } from './OffDeckControls'
import { HighlightOffdeckSlot } from './HighlightOffdeckSlot'
import { SlotOverflowMenu } from '../DeckSetup/SlotOverflowMenu'
import { wellFillFromWellContents } from '../../../components/organisms/LabwareOnDeck/utils'

import type { Dispatch, SetStateAction } from 'react'
import type { CoordinateTuple, DeckSlotId } from '@opentrons/shared-data'
import type { LabwareOnDeck } from '../../../step-forms'
import type { Selection } from '../../../ui/steps'
import type * as wellContentsSelectors from '../../../top-selectors/well-contents'

const ZERO_SLOT_POSITION: CoordinateTuple = [0, 0, 0]

interface OffDeckLabwareListProps {
  tab: 'startingDeck' | 'protocolSteps'
  addLabware: () => void
  offDeckLabware: LabwareOnDeck[]
  allWellContentsForActiveItem: wellContentsSelectors.WellContentsByLabware | null
  selectedDropdownSelection: Selection[]
  hoveredDropdownItem: Selection
  liquidDisplayColors: string[]
  hoverSlot: DeckSlotId | null
  menuListId: DeckSlotId | null
  setHoverSlot: Dispatch<SetStateAction<DeckSlotId | null>>
  setShowMenuListForId: Dispatch<SetStateAction<DeckSlotId | null>>
}

export function OffDeckLabwareList({
  tab,
  addLabware,
  offDeckLabware,
  allWellContentsForActiveItem,
  selectedDropdownSelection,
  hoveredDropdownItem,
  liquidDisplayColors,
  hoverSlot,
  menuListId,
  setHoverSlot,
  setShowMenuListForId,
}: OffDeckLabwareListProps): JSX.Element {
  const { t } = useTranslation('starting_deck_state')
  return (
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
