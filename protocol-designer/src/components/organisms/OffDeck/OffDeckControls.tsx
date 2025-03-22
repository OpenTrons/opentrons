import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  Flex,
  JUSTIFY_CENTER,
  Link,
  RobotCoordsForeignDiv,
  StyledText,
} from '@opentrons/components'
import { DECK_CONTROLS_STYLE } from '../../../pages/Designer/DeckSetup/constants'

import type { Dispatch, SetStateAction } from 'react'
import type {
  CoordinateTuple,
  DeckSlotId,
  Dimensions,
} from '@opentrons/shared-data'
import type { DeckSetupTabType } from '../../../pages/Designer/types'

interface OffDeckControlsProps extends DeckSetupTabType {
  hover: string | null
  tab: 'startingDeck' | 'protocolSteps'
  setHover: Dispatch<SetStateAction<string | null>>
  slotBoundingBox: Dimensions
  labwareId: string
  slotPosition: CoordinateTuple | null
  setShowMenuListForId: Dispatch<SetStateAction<string | null>>
  menuListId: DeckSlotId | null
  isSelected?: boolean
}

export function OffDeckControls(
  props: OffDeckControlsProps
): JSX.Element | null {
  const {
    hover,
    tab,
    setHover,
    slotBoundingBox,
    labwareId,
    setShowMenuListForId,
    menuListId,
    slotPosition,
    isSelected = false,
  } = props
  const { t } = useTranslation('starting_deck_state')
  if (tab === 'protocolSteps' || slotPosition === null || isSelected)
    return null

  const hoverOpacity =
    (hover != null && hover === labwareId) || menuListId === labwareId
      ? '1'
      : '0'

  return (
    <RobotCoordsForeignDiv
      x={slotPosition[0]}
      y={slotPosition[1]}
      width={slotBoundingBox.xDimension}
      height={slotBoundingBox.yDimension}
      innerDivProps={{
        style: {
          opacity: hoverOpacity,
          ...DECK_CONTROLS_STYLE,
        },
        onMouseEnter: () => {
          setHover(labwareId)
        },
        onMouseLeave: () => {
          setHover(null)
        },
        onClick: () => {
          setShowMenuListForId(labwareId)
        },
      }}
    >
      <Flex
        css={css`
          justify-content: ${JUSTIFY_CENTER};
          width: 100%;
          opacity: ${hoverOpacity};
        `}
      >
        <Link
          role="button"
          onClick={() => {
            setShowMenuListForId(labwareId)
          }}
        >
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {t('edit_labware')}
          </StyledText>
        </Link>
      </Flex>
    </RobotCoordsForeignDiv>
  )
}
