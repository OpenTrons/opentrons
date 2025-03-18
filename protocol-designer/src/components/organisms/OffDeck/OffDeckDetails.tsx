import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_END,
  OVERFLOW_AUTO,
  SPACING,
  StyledText,
} from '@opentrons/components'

import * as wellContentsSelectors from '../../../top-selectors/well-contents'
import { selectors } from '../../../labware-ingred/selectors'
import { getDeckSetupForActiveItem } from '../../../top-selectors/labware-locations'
import { SlotDetailsContainer } from '../../../components/organisms'
import { getRobotType } from '../../../file-data/selectors'
import {
  getHoveredDropdownItem,
  getSelectedDropdownItem,
} from '../../../ui/steps/selectors'
import { OffDeckLabwareList } from './OffDeckLabwareList'

import type { DeckSlotId } from '@opentrons/shared-data'
import type { DeckSetupTabType } from '../../../pages/Designer/types'

const OFF_DECK_MAP_WIDTH = '41.625rem'
const OFF_DECK_MAP_HEIGHT = '44rem'
const OFF_DECK_MAP_HEIGHT_FOR_STEP = '30.3rem'
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
        <OffDeckLabwareList
          tab={tab}
          addLabware={addLabware}
          offDeckLabware={offDeckLabware}
          allWellContentsForActiveItem={allWellContentsForActiveItem}
          selectedDropdownSelection={selectedDropdownSelection}
          hoveredDropdownItem={hoveredDropdownItem}
          liquidDisplayColors={liquidDisplayColors}
          hoverSlot={hoverSlot}
          menuListId={menuListId}
          setHoverSlot={setHoverSlot}
          setShowMenuListForId={setShowMenuListForId}
        />
      </Flex>
    </Flex>
  )
}
