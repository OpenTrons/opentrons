import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { StyledText } from '../../atoms/text'
import { ODD_FOCUS_VISIBLE } from '../../atoms/buttons/constants'
import { Modal } from '../../molecules/Modal'

import type { ModalHeaderBaseProps } from '../../molecules/Modal/types'

interface AddDeckConfigurationModalProps {
  slotName: string
}

// ToDo (kk:09/29/2023)
// update this component when Deck configuration component is ready
// Need to use getFixtureDisplayName
export function AddDeckConfigurationModal({
  slotName,
}: AddDeckConfigurationModalProps): JSX.Element {
  const { t } = useTranslation('device_details')

  const modalHeader: ModalHeaderBaseProps = {
    title: t('add_to_slot', { slotName: slotName }),
    hasExitIcon: true,
  }

  return (
    <Modal header={modalHeader}>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing32}>
        <StyledText as="p">{t('add_to_slot_description')}</StyledText>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          <AddFixtureButton fixtureLoadName={t('staging_area_slot')} />
          <AddFixtureButton fixtureLoadName={t('trash')} />
          <AddFixtureButton fixtureLoadName={t('waste_chute')} />
        </Flex>
      </Flex>
    </Modal>
  )
}

interface AddFixtureButtonProps {
  fixtureLoadName: string
}
function AddFixtureButton({
  fixtureLoadName,
}: AddFixtureButtonProps): JSX.Element {
  const { t } = useTranslation('device_details')

  // ToDo (kk:10/02/2023)
  // Need to update a function for onClick
  return (
    <Btn
      onClick={() => {}}
      display="flex"
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      flexDirection={DIRECTION_ROW}
      alignItems={ALIGN_CENTER}
      padding={`${SPACING.spacing16} ${SPACING.spacing24}`}
      css={FIXTIRE_BUTTON_STYLE}
    >
      <StyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
        {fixtureLoadName}
      </StyledText>
      <StyledText as="p">{t('add')}</StyledText>
    </Btn>
  )
}

const FIXTIRE_BUTTON_STYLE = css`
  background-color: ${COLORS.light1};
  cursor: default;
  border-radius: ${BORDERS.borderRadiusSize3};
  box-shadow: none;

  &:focus {
    background-color: ${COLORS.light1Pressed};
    box-shadow: none;
  }

  &:hover {
    border: none;
    box-shadow: none;
    background-color: ${COLORS.light1};
  }

  &:focus-visible {
    box-shadow: ${ODD_FOCUS_VISIBLE};
    background-color: ${COLORS.light1};
  }

  &:active {
    background-color: ${COLORS.light1Pressed};
  }

  &:disabled {
    background-color: ${COLORS.light1};
    color: ${COLORS.darkBlack60};
  }
`
