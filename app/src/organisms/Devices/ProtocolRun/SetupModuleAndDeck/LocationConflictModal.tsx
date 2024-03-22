import * as React from 'react'
import { createPortal } from 'react-dom'
import { Trans, useTranslation } from 'react-i18next'
import {
  useDeckConfigurationQuery,
  useUpdateDeckConfigurationMutation,
} from '@opentrons/react-api-client'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_END,
  JUSTIFY_SPACE_BETWEEN,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  getCutoutDisplayName,
  getFixtureDisplayName,
  getModuleDisplayName,
  SINGLE_RIGHT_CUTOUTS,
  SINGLE_LEFT_SLOT_FIXTURE,
  SINGLE_RIGHT_SLOT_FIXTURE,
  THERMOCYCLER_MODULE_V1,
  THERMOCYCLER_MODULE_V2,
} from '@opentrons/shared-data'
import { getTopPortalEl } from '../../../../App/portal'
import { LegacyModal } from '../../../../molecules/LegacyModal'
import { Modal } from '../../../../molecules/Modal'
import { SmallButton } from '../../../../atoms/buttons/SmallButton'

import type {
  CutoutConfig,
  CutoutId,
  CutoutFixtureId,
  ModuleModel,
} from '@opentrons/shared-data'

interface LocationConflictModalProps {
  onCloseClick: () => void
  cutoutId: CutoutId
  missingLabwareDisplayName?: string | null
  requiredFixtureId?: CutoutFixtureId
  requiredModule?: ModuleModel
  isOnDevice?: boolean
}

export const LocationConflictModal = (
  props: LocationConflictModalProps
): JSX.Element => {
  const {
    onCloseClick,
    cutoutId,
    missingLabwareDisplayName,
    requiredFixtureId,
    requiredModule,
    isOnDevice = false,
  } = props
  const { t, i18n } = useTranslation(['protocol_setup', 'shared'])
  const deckConfig = useDeckConfigurationQuery().data ?? []
  const { updateDeckConfiguration } = useUpdateDeckConfigurationMutation()
  const deckConfigurationAtLocationFixtureId = deckConfig.find(
    (deckFixture: CutoutConfig) => deckFixture.cutoutId === cutoutId
  )?.cutoutFixtureId

  const isThermocycler =
    requiredModule === THERMOCYCLER_MODULE_V1 ||
    requiredModule === THERMOCYCLER_MODULE_V2

  const currentFixtureDisplayName =
    deckConfigurationAtLocationFixtureId != null
      ? getFixtureDisplayName(deckConfigurationAtLocationFixtureId)
      : ''

  // get fixture display name at A1 for themocycler if B1 is slot
  const deckConfigurationAtA1 = deckConfig.find(
    (deckFixture: CutoutConfig) => deckFixture.cutoutId === 'cutoutA1'
  )?.cutoutFixtureId

  const currentThermocyclerFixtureDisplayName =
    currentFixtureDisplayName === 'Slot' && deckConfigurationAtA1 != null
      ? getFixtureDisplayName(deckConfigurationAtA1)
      : currentFixtureDisplayName

  const handleUpdateDeck = (): void => {
    if (requiredFixtureId != null) {
      const newRequiredFixtureDeckConfig = deckConfig.map(fixture =>
        fixture.cutoutId === cutoutId
          ? { ...fixture, cutoutFixtureId: requiredFixtureId }
          : fixture
      )

      updateDeckConfiguration(newRequiredFixtureDeckConfig)
    } else {
      const isRightCutout = SINGLE_RIGHT_CUTOUTS.includes(cutoutId)
      const singleSlotFixture = isRightCutout
        ? SINGLE_RIGHT_SLOT_FIXTURE
        : SINGLE_LEFT_SLOT_FIXTURE

      const newSingleSlotDeckConfig = deckConfig.map(fixture =>
        fixture.cutoutId === cutoutId
          ? { ...fixture, cutoutFixtureId: singleSlotFixture }
          : fixture
      )

      // add A1 and B1 single slot config for thermocycler
      const newThermocyclerDeckConfig = isThermocycler
        ? newSingleSlotDeckConfig.map(fixture =>
            fixture.cutoutId === 'cutoutA1' || fixture.cutoutId === 'cutoutB1'
              ? { ...fixture, cutoutFixtureId: SINGLE_LEFT_SLOT_FIXTURE }
              : fixture
          )
        : newSingleSlotDeckConfig

      updateDeckConfiguration(newThermocyclerDeckConfig)
    }
    onCloseClick()
  }

  let protocolSpecifiesDisplayName = ''
  if (missingLabwareDisplayName != null) {
    protocolSpecifiesDisplayName = missingLabwareDisplayName
  } else if (requiredFixtureId != null) {
    protocolSpecifiesDisplayName = getFixtureDisplayName(requiredFixtureId)
  } else if (requiredModule != null) {
    protocolSpecifiesDisplayName = getModuleDisplayName(requiredModule)
  }

  return createPortal(
    isOnDevice ? (
      <Modal
        onOutsideClick={onCloseClick}
        header={{
          title: t('deck_conflict'),
          hasExitIcon: true,
          onClick: onCloseClick,
          iconName: 'ot-alert',
          iconColor: COLORS.yellow50,
        }}
      >
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing32}>
          <Trans
            t={t}
            i18nKey={
              isThermocycler
                ? 'deck_conflict_info_thermocycler'
                : 'deck_conflict_info'
            }
            values={{
              currentFixture: currentFixtureDisplayName,
              cutout: getCutoutDisplayName(cutoutId),
            }}
            components={{
              block: <StyledText as="p" />,
              strong: <strong />,
            }}
          />
          <Flex flexDirection={DIRECTION_COLUMN}>
            <StyledText
              as="p"
              fontWeight={TYPOGRAPHY.fontWeightBold}
              paddingBottom={SPACING.spacing8}
            >
              {t('slot_location', {
                slotName: isThermocycler
                  ? 'A1 + B1'
                  : getCutoutDisplayName(cutoutId),
              })}
            </StyledText>
            <Flex
              flexDirection={DIRECTION_COLUMN}
              paddingTop={SPACING.spacing8}
              gridGap={SPACING.spacing8}
            >
              <Flex
                padding={SPACING.spacing24}
                backgroundColor={COLORS.grey35}
                flexDirection={DIRECTION_ROW}
                alignItems={ALIGN_CENTER}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                borderRadius={BORDERS.borderRadius4}
              >
                <StyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
                  {t('protocol_specifies')}
                </StyledText>

                <StyledText as="p" color={COLORS.grey60}>
                  {protocolSpecifiesDisplayName}
                </StyledText>
              </Flex>
              <Flex
                padding={SPACING.spacing24}
                backgroundColor={COLORS.grey35}
                flexDirection={DIRECTION_ROW}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                alignItems={ALIGN_CENTER}
                borderRadius={BORDERS.borderRadius4}
              >
                <StyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
                  {t('currently_configured')}
                </StyledText>

                <StyledText as="p" color={COLORS.grey60}>
                  {currentFixtureDisplayName}
                </StyledText>
              </Flex>
            </Flex>
          </Flex>
          <Flex
            flexDirection={DIRECTION_ROW}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            gridGap={SPACING.spacing8}
          >
            <SmallButton
              buttonType="secondary"
              onClick={onCloseClick}
              buttonText={i18n.format(t('shared:cancel'), 'capitalize')}
              width="100%"
            />
            <SmallButton
              onClick={handleUpdateDeck}
              buttonText={i18n.format(t('update_deck'), 'capitalize')}
              width="100%"
            />
          </Flex>
        </Flex>
      </Modal>
    ) : (
      <LegacyModal
        title={
          <Flex
            flexDirection={DIRECTION_ROW}
            gridGap={SPACING.spacing10}
            alignItems={ALIGN_CENTER}
          >
            <Icon name="ot-alert" size="1rem" color={COLORS.yellow50} />
            <StyledText as="h3" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
              {t('deck_conflict')}
            </StyledText>
          </Flex>
        }
        onClose={onCloseClick}
        width="27.75rem"
      >
        <Flex flexDirection={DIRECTION_COLUMN}>
          <Trans
            t={t}
            i18nKey={
              isThermocycler
                ? 'deck_conflict_info_thermocycler'
                : 'deck_conflict_info'
            }
            values={{
              currentFixture: currentFixtureDisplayName,
              cutout: getCutoutDisplayName(cutoutId),
            }}
            components={{
              block: <StyledText fontSize={TYPOGRAPHY.fontSizeH4} />,
              strong: <strong />,
            }}
          />
          <Flex paddingY={SPACING.spacing16} flexDirection={DIRECTION_COLUMN}>
            <StyledText
              fontSize={TYPOGRAPHY.fontSizeH4}
              fontWeight={TYPOGRAPHY.fontWeightBold}
            >
              {t('slot_location', {
                slotName: isThermocycler
                  ? 'A1 + B1'
                  : getCutoutDisplayName(cutoutId),
              })}
            </StyledText>
            <Flex
              flexDirection={DIRECTION_COLUMN}
              paddingTop={SPACING.spacing8}
              gridGap={SPACING.spacing8}
            >
              <Flex
                padding={SPACING.spacing8}
                backgroundColor={COLORS.grey20}
                flexDirection={DIRECTION_ROW}
                gridGap={SPACING.spacing20}
                alignItems={ALIGN_CENTER}
                borderRadius={BORDERS.borderRadius4}
              >
                <StyledText as="label" width={SPACING.spacing120}>
                  {t('protocol_specifies')}
                </StyledText>
                <StyledText as="label" flex="1">
                  {protocolSpecifiesDisplayName}
                </StyledText>
              </Flex>
              <Flex
                padding={SPACING.spacing8}
                backgroundColor={COLORS.grey20}
                flexDirection={DIRECTION_ROW}
                gridGap={SPACING.spacing20}
                alignItems={ALIGN_CENTER}
                borderRadius={BORDERS.borderRadius4}
              >
                <StyledText as="label" width={SPACING.spacing120}>
                  {t('currently_configured')}
                </StyledText>
                <StyledText as="label" flex="1">
                  {isThermocycler
                    ? currentThermocyclerFixtureDisplayName
                    : currentFixtureDisplayName}
                </StyledText>
              </Flex>
            </Flex>
          </Flex>

          <Flex
            flexDirection={DIRECTION_ROW}
            gridGap={SPACING.spacing8}
            justifyContent={JUSTIFY_END}
          >
            <SecondaryButton onClick={onCloseClick}>
              {i18n.format(t('shared:cancel'), 'capitalize')}
            </SecondaryButton>
            <PrimaryButton onClick={handleUpdateDeck}>
              {t('update_deck')}
            </PrimaryButton>
          </Flex>
        </Flex>
      </LegacyModal>
    ),
    getTopPortalEl()
  )
}
