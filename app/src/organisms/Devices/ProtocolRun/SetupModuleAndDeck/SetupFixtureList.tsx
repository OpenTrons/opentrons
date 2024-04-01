import * as React from 'react'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  BORDERS,
  Box,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  FLEX_MODULE_ADDRESSABLE_AREAS,
  SINGLE_SLOT_FIXTURES,
  getCutoutDisplayName,
  getFixtureDisplayName,
} from '@opentrons/shared-data'
import { StatusLabel } from '../../../../atoms/StatusLabel'
import { TertiaryButton } from '../../../../atoms/buttons/TertiaryButton'
import { LocationConflictModal } from './LocationConflictModal'
import { NotConfiguredModal } from './NotConfiguredModal'
import { getFixtureImage } from './utils'
import { DeckFixtureSetupInstructionsModal } from '../../../DeviceDetailsDeckConfiguration/DeckFixtureSetupInstructionsModal'

import type { CutoutConfigAndCompatibility } from '../../../../resources/deck_configuration/hooks'

interface SetupFixtureListProps {
  deckConfigCompatibility: CutoutConfigAndCompatibility[]
}

export const SetupFixtureList = (props: SetupFixtureListProps): JSX.Element => {
  const { deckConfigCompatibility } = props
  const { t, i18n } = useTranslation('protocol_setup')
  return (
    <>
      <Flex
        flexDirection={DIRECTION_ROW}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        marginTop={SPACING.spacing16}
        marginLeft={SPACING.spacing20}
        marginBottom={SPACING.spacing4}
      >
        <StyledText
          css={TYPOGRAPHY.labelSemiBold}
          marginBottom={SPACING.spacing8}
          width="45%"
        >
          {i18n.format(t('fixture_name'), 'capitalize')}
        </StyledText>
        <StyledText
          css={TYPOGRAPHY.labelSemiBold}
          marginRight={SPACING.spacing16}
          width="15%"
        >
          {t('location')}
        </StyledText>
        <StyledText
          css={TYPOGRAPHY.labelSemiBold}
          marginRight={SPACING.spacing16}
          width="15%"
        >
          {t('status')}
        </StyledText>
      </Flex>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        width="100%"
        overflowY="auto"
        gridGap={SPACING.spacing4}
        marginBottom={SPACING.spacing24}
      >
        {deckConfigCompatibility.map(cutoutConfigAndCompatibility => {
          return cutoutConfigAndCompatibility.requiredAddressableAreas.some(raa => FLEX_MODULE_ADDRESSABLE_AREAS.includes(raa))
            ? null // don't list modules here, they're covered by SetupModuleList
            : (
              <FixtureListItem
                key={cutoutConfigAndCompatibility.cutoutId}
                {...cutoutConfigAndCompatibility}
              />
            )
        })}
      </Flex>
    </>
  )
}

interface FixtureListItemProps extends CutoutConfigAndCompatibility { }

export function FixtureListItem({
  cutoutId,
  cutoutFixtureId,
  compatibleCutoutFixtureIds,
  missingLabwareDisplayName,
}: FixtureListItemProps): JSX.Element {
  const { t } = useTranslation('protocol_setup')

  const isCurrentFixtureCompatible =
    cutoutFixtureId != null &&
    compatibleCutoutFixtureIds.includes(cutoutFixtureId)
  const isRequiredSingleSlotMissing = missingLabwareDisplayName != null
  const isConflictingFixtureConfigured =
    cutoutFixtureId != null && !SINGLE_SLOT_FIXTURES.includes(cutoutFixtureId)
  let statusLabel
  if (!isCurrentFixtureCompatible) {
    statusLabel = (
      <StatusLabel
        status={
          isConflictingFixtureConfigured
            ? t('location_conflict')
            : t('not_configured')
        }
        backgroundColor={COLORS.yellow30}
        iconColor={COLORS.yellow60}
        textColor={COLORS.yellow60}
      />
    )
  } else {
    statusLabel = (
      <StatusLabel
        status={t('configured')}
        backgroundColor={COLORS.green30}
        iconColor={COLORS.green60}
        textColor={COLORS.green60}
      />
    )
  }

  const [
    showLocationConflictModal,
    setShowLocationConflictModal,
  ] = React.useState<boolean>(false)
  const [
    showNotConfiguredModal,
    setShowNotConfiguredModal,
  ] = React.useState<boolean>(false)

  const [
    showSetupInstructionsModal,
    setShowSetupInstructionsModal,
  ] = React.useState<boolean>(false)

  return (
    <>
      {showNotConfiguredModal ? (
        <NotConfiguredModal
          onCloseClick={() => setShowNotConfiguredModal(false)}
          cutoutId={cutoutId}
          requiredFixtureId={compatibleCutoutFixtureIds[0]}
        />
      ) : null}
      {showLocationConflictModal ? (
        <LocationConflictModal
          onCloseClick={() => setShowLocationConflictModal(false)}
          cutoutId={cutoutId}
          missingLabwareDisplayName={missingLabwareDisplayName}
          requiredFixtureId={compatibleCutoutFixtureIds[0]}
        />
      ) : null}
      {showSetupInstructionsModal ? (
        <DeckFixtureSetupInstructionsModal
          setShowSetupInstructionsModal={setShowSetupInstructionsModal}
        />
      ) : null}
      <Box
        border={BORDERS.styleSolid}
        borderColor={COLORS.grey30}
        borderWidth="1px"
        borderRadius={BORDERS.borderRadius4}
        padding={SPACING.spacing16}
        backgroundColor={COLORS.white}
      >
        <Flex
          flexDirection={DIRECTION_ROW}
          alignItems={JUSTIFY_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
        >
          <Flex alignItems={JUSTIFY_CENTER} width="45%">
            {cutoutFixtureId != null ? (
              <img
                width="60px"
                height="54px"
                src={
                  // show the current fixture for a missing single slot
                  isCurrentFixtureCompatible || isRequiredSingleSlotMissing
                    ? getFixtureImage(cutoutFixtureId)
                    : getFixtureImage(compatibleCutoutFixtureIds?.[0])
                }
              />
            ) : null}
            <Flex flexDirection={DIRECTION_COLUMN}>
              <StyledText
                css={TYPOGRAPHY.pSemiBold}
                marginLeft={SPACING.spacing20}
              >
                {isCurrentFixtureCompatible || isRequiredSingleSlotMissing
                  ? getFixtureDisplayName(cutoutFixtureId)
                  : getFixtureDisplayName(compatibleCutoutFixtureIds?.[0])}
              </StyledText>
              <Btn
                marginLeft={SPACING.spacing16}
                css={css`
                  color: ${COLORS.blue50};

                  &:hover {
                    color: ${COLORS.blue55};
                  }
                `}
                marginTop={SPACING.spacing4}
                onClick={() => setShowSetupInstructionsModal(true)}
              >
                <StyledText marginLeft={SPACING.spacing4} as="p">
                  {t('view_setup_instructions')}
                </StyledText>
              </Btn>
            </Flex>
          </Flex>
          <StyledText as="p" width="15%">
            {getCutoutDisplayName(cutoutId)}
          </StyledText>
          <Flex
            width="15%"
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing10}
          >
            {statusLabel}
            {!isCurrentFixtureCompatible ? (
              <TertiaryButton
                width="max-content"
                onClick={() =>
                  isConflictingFixtureConfigured
                    ? setShowLocationConflictModal(true)
                    : setShowNotConfiguredModal(true)
                }
              >
                <StyledText as="label" cursor="pointer">
                  {t('resolve')}
                </StyledText>
              </TertiaryButton>
            ) : null}
          </Flex>
        </Flex>
      </Box>
    </>
  )
}
