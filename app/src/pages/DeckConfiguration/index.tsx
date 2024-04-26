import * as React from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import isEqual from 'lodash/isEqual'

import {
  DeckConfigurator,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_AROUND,
} from '@opentrons/components'
import { useUpdateDeckConfigurationMutation } from '@opentrons/react-api-client'
import {
  SINGLE_RIGHT_CUTOUTS,
  SINGLE_LEFT_SLOT_FIXTURE,
  SINGLE_RIGHT_SLOT_FIXTURE,
  SINGLE_LEFT_CUTOUTS,
  SINGLE_CENTER_SLOT_FIXTURE,
  getDeckDefFromRobotType,
  FLEX_ROBOT_TYPE,
} from '@opentrons/shared-data'

import { SmallButton } from '../../atoms/buttons'
import { ChildNavigation } from '../../organisms/ChildNavigation'
import { AddFixtureModal } from '../../organisms/DeviceDetailsDeckConfiguration/AddFixtureModal'
import { DeckFixtureSetupInstructionsModal } from '../../organisms/DeviceDetailsDeckConfiguration/DeckFixtureSetupInstructionsModal'
import { DeckConfigurationDiscardChangesModal } from '../../organisms/DeviceDetailsDeckConfiguration/DeckConfigurationDiscardChangesModal'
import { getTopPortalEl } from '../../App/portal'
import { useNotifyDeckConfigurationQuery } from '../../resources/deck_configuration'

import type {
  CutoutFixtureId,
  CutoutId,
  DeckConfiguration,
} from '@opentrons/shared-data'

export function DeckConfigurationEditor(): JSX.Element {
  const { t, i18n } = useTranslation([
    'protocol_setup',
    'devices_landing',
    'shared',
  ])
  const history = useHistory()
  const [
    showSetupInstructionsModal,
    setShowSetupInstructionsModal,
  ] = React.useState<boolean>(false)
  const [
    showConfigurationModal,
    setShowConfigurationModal,
  ] = React.useState<boolean>(false)
  const [targetCutoutId, setTargetCutoutId] = React.useState<CutoutId | null>(
    null
  )
  const [
    showDiscardChangeModal,
    setShowDiscardChangeModal,
  ] = React.useState<boolean>(false)

  const deckDef = getDeckDefFromRobotType(FLEX_ROBOT_TYPE)
  const deckConfig = useNotifyDeckConfigurationQuery().data ?? []
  const { updateDeckConfiguration } = useUpdateDeckConfigurationMutation()

  const [
    currentDeckConfig,
    setCurrentDeckConfig,
  ] = React.useState<DeckConfiguration>(deckConfig)

  const handleClickAdd = (cutoutId: CutoutId): void => {
    setTargetCutoutId(cutoutId)
    setShowConfigurationModal(true)
  }

  const handleClickRemove = (
    cutoutId: CutoutId,
    cutoutFixtureId: CutoutFixtureId
  ): void => {
    let replacementFixtureId: CutoutFixtureId = SINGLE_CENTER_SLOT_FIXTURE
    if (SINGLE_RIGHT_CUTOUTS.includes(cutoutId)) {
      replacementFixtureId = SINGLE_RIGHT_SLOT_FIXTURE
    } else if (SINGLE_LEFT_CUTOUTS.includes(cutoutId)) {
      replacementFixtureId = SINGLE_LEFT_SLOT_FIXTURE
    }

    const fixtureGroup =
      deckDef.cutoutFixtures.find(cf => cf.id === cutoutFixtureId)
        ?.fixtureGroup ?? {}

    let newDeckConfig = deckConfig
    if (cutoutId in fixtureGroup) {
      const groupMap =
        fixtureGroup[cutoutId]?.find(group =>
          Object.entries(group).every(([cId, cfId]) =>
            deckConfig.find(
              config =>
                config.cutoutId === cId && config.cutoutFixtureId === cfId
            )
          )
        ) ?? {}
      newDeckConfig = deckConfig.map(cutoutConfig =>
        cutoutConfig.cutoutId in groupMap
          ? {
              ...cutoutConfig,
              cutoutFixtureId: replacementFixtureId,
              opentronsModuleSerialNumber: undefined,
            }
          : cutoutConfig
      )
    } else {
      newDeckConfig = deckConfig.map(cutoutConfig =>
        cutoutConfig.cutoutId === cutoutId
          ? {
              ...cutoutConfig,
              cutoutFixtureId: replacementFixtureId,
              opentronsModuleSerialNumber: undefined,
            }
          : cutoutConfig
      )
    }
    updateDeckConfiguration(newDeckConfig)
  }

  const handleClickConfirm = (): void => {
    if (!isEqual(deckConfig, currentDeckConfig)) {
      updateDeckConfiguration(currentDeckConfig)
    }
    history.goBack()
  }

  const handleClickBack = (): void => {
    if (!isEqual(deckConfig, currentDeckConfig)) {
      setShowDiscardChangeModal(true)
    } else {
      history.goBack()
    }
  }

  const secondaryButtonProps: React.ComponentProps<typeof SmallButton> = {
    onClick: () => setShowSetupInstructionsModal(true),
    buttonText: i18n.format(t('setup_instructions'), 'titleCase'),
    buttonType: 'tertiaryLowLight',
    iconName: 'information',
    iconPlacement: 'startIcon',
  }

  React.useEffect(() => {
    setCurrentDeckConfig(deckConfig)
  }, [deckConfig])

  return (
    <>
      {createPortal(
        <>
          {showDiscardChangeModal ? (
            <DeckConfigurationDiscardChangesModal
              setShowConfirmationModal={setShowDiscardChangeModal}
            />
          ) : null}
          {showSetupInstructionsModal ? (
            <DeckFixtureSetupInstructionsModal
              setShowSetupInstructionsModal={setShowSetupInstructionsModal}
              isOnDevice
            />
          ) : null}
          {showConfigurationModal && targetCutoutId != null ? (
            <AddFixtureModal
              cutoutId={targetCutoutId}
              setShowAddFixtureModal={setShowConfigurationModal}
              setCurrentDeckConfig={setCurrentDeckConfig}
              isOnDevice
            />
          ) : null}
        </>,
        getTopPortalEl()
      )}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_SPACE_AROUND}
      >
        <ChildNavigation
          header={t('devices_landing:deck_configuration')}
          onClickBack={handleClickBack}
          buttonText={t('shared:confirm')}
          onClickButton={handleClickConfirm}
          secondaryButtonProps={secondaryButtonProps}
        />
        <Flex marginTop="7.75rem" justifyContent={JUSTIFY_CENTER}>
          <DeckConfigurator
            deckConfig={currentDeckConfig}
            handleClickAdd={handleClickAdd}
            handleClickRemove={handleClickRemove}
          />
        </Flex>
      </Flex>
    </>
  )
}
