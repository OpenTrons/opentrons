import * as React from 'react'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  PrimaryButton,
  RESPONSIVENESS,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  useDeckLocationSelect,
} from '@opentrons/components'
import { getDeckDefFromRobotType } from '@opentrons/shared-data'

import { SmallButton } from '../../atoms/buttons'
import { TwoUpTileLayout } from '../LabwarePositionCheck/TwoUpTileLayout'

import type { AddressableAreaName, RobotType } from '@opentrons/shared-data'

// TODO: get help link article URL

interface ChooseLocationProps {
  handleProceed: () => void
  handleGoBack: () => void
  title: string
  body: string | JSX.Element
  robotType: RobotType
  moveToAddressableArea: (addressableArea: AddressableAreaName) => Promise<void>
  isOnDevice: boolean
}

export const ChooseLocation = (
  props: ChooseLocationProps
): JSX.Element | null => {
  const {
    handleProceed,
    handleGoBack,
    title,
    body,
    robotType,
    moveToAddressableArea,
    isOnDevice,
  } = props
  const { i18n, t } = useTranslation(['drop_tip_wizard', 'shared'])
  const deckDef = getDeckDefFromRobotType(robotType)
  const { DeckLocationSelect, selectedLocation } = useDeckLocationSelect(
    robotType
  )

  const handleConfirmPosition = (): void => {
    const deckSlot = deckDef.locations.addressableAreas.find(
      l => l.id === selectedLocation.slotName
    )?.id

    if (deckSlot != null) {
      void moveToAddressableArea(deckSlot).then(() => {
        handleProceed()
      })
    }
  }

  if (isOnDevice) {
    return (
      <Flex
        padding={SPACING.spacing32}
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        flex="1"
      >
        <Flex
          flexDirection={DIRECTION_ROW}
          gridGap={SPACING.spacing24}
          flex="1"
        >
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing8}
            width="100%"
            flex="1"
          >
            <StyledText as="h4" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
              {title}
            </StyledText>
            <StyledText as="p">{body}</StyledText>
          </Flex>
          <Flex
            flex="1"
            justifyContent={JUSTIFY_CENTER}
            paddingLeft={SPACING.spacing24}
          >
            {DeckLocationSelect}
          </Flex>
        </Flex>
        <Flex
          width="100%"
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          css={ALIGN_BUTTONS}
          gridGap={SPACING.spacing8}
        >
          <Btn
            onClick={() => {
              handleGoBack()
            }}
          >
            <StyledText css={GO_BACK_BUTTON_STYLE}>
              {t('shared:go_back')}
            </StyledText>
          </Btn>
          <SmallButton
            buttonText={i18n.format(t('move_to_slot'), 'capitalize')}
            onClick={handleConfirmPosition}
          />
        </Flex>
      </Flex>
    )
  } else {
    return (
      <Flex css={TILE_CONTAINER_STYLE}>
        <TwoUpTileLayout
          title={title}
          body={body}
          rightElement={DeckLocationSelect}
          footer={
            <Flex
              width="100%"
              justifyContent={JUSTIFY_SPACE_BETWEEN}
              gridGap={SPACING.spacing8}
            >
              <Btn
                onClick={() => {
                  handleGoBack()
                }}
              >
                <StyledText css={GO_BACK_BUTTON_STYLE}>
                  {t('shared:go_back')}
                </StyledText>
              </Btn>
              <PrimaryButton onClick={handleConfirmPosition}>
                {i18n.format(t('move_to_slot'), 'capitalize')}
              </PrimaryButton>
            </Flex>
          }
        />
      </Flex>
    )
  }
}

const TILE_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  height: 24.625rem;
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: 29.5rem;
  }
`
const GO_BACK_BUTTON_STYLE = css`
  ${TYPOGRAPHY.pSemiBold};
  color: ${COLORS.grey50};

  &:hover {
    opacity: 70%;
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
    font-size: ${TYPOGRAPHY.fontSize22};
    padding-left: 0rem;
    &:hover {
      opacity: 100%;
    }
  }
`

const ALIGN_BUTTONS = css`
  align-items: ${ALIGN_FLEX_END};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    align-items: ${ALIGN_CENTER};
  }
`
