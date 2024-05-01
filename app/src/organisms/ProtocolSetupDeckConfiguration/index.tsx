import * as React from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import {
  BaseDeck,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  SPACING,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  FLEX_SINGLE_SLOT_BY_CUTOUT_ID,
  MAGNETIC_BLOCK_V1_FIXTURE,
  MODULE_FIXTURES_BY_MODEL,
  STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE,
  getSimplestDeckConfigForProtocol,
} from '@opentrons/shared-data'
import { useUpdateDeckConfigurationMutation } from '@opentrons/react-api-client'

import { ChildNavigation } from '../ChildNavigation'
import { AddFixtureModal } from '../DeviceDetailsDeckConfiguration/AddFixtureModal'
import { DeckConfigurationDiscardChangesModal } from '../DeviceDetailsDeckConfiguration/DeckConfigurationDiscardChangesModal'
import { useMostRecentCompletedAnalysis } from '../LabwarePositionCheck/useMostRecentCompletedAnalysis'
import { getTopPortalEl } from '../../App/portal'
import { useNotifyDeckConfigurationQuery } from '../../resources/deck_configuration'

import type {
  CutoutFixtureId,
  CutoutId,
  DeckConfiguration,
  ModuleModel,
} from '@opentrons/shared-data'
import type { ModuleOnDeck } from '@opentrons/components'
import type { SetupScreens } from '../../pages/ProtocolSetup'

interface ProtocolSetupDeckConfigurationProps {
  cutoutId: CutoutId | null
  runId: string
  setSetupScreen: React.Dispatch<React.SetStateAction<SetupScreens>>
  providedFixtureOptions: CutoutFixtureId[]
}

export function ProtocolSetupDeckConfiguration({
  cutoutId,
  runId,
  setSetupScreen,
  providedFixtureOptions,
}: ProtocolSetupDeckConfigurationProps): JSX.Element {
  const { t } = useTranslation(['protocol_setup', 'devices_landing', 'shared'])

  const [
    showConfigurationModal,
    setShowConfigurationModal,
  ] = React.useState<boolean>(true)
  const [
    showDiscardChangeModal,
    setShowDiscardChangeModal,
  ] = React.useState<boolean>(false)

  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)
  const deckConfig = useNotifyDeckConfigurationQuery()?.data ?? []

  const simplestDeckConfig = getSimplestDeckConfigForProtocol(
    mostRecentAnalysis
  ).map(({ cutoutId, cutoutFixtureId }) => ({ cutoutId, cutoutFixtureId }))

  const targetDeckConfig = simplestDeckConfig.find(
    deck => deck.cutoutId === cutoutId
  )

  const mergedDeckConfig = deckConfig.map(config =>
    targetDeckConfig != null && config.cutoutId === targetDeckConfig.cutoutId
      ? targetDeckConfig
      : config
  )

  const [
    currentDeckConfig,
    setCurrentDeckConfig,
  ] = React.useState<DeckConfiguration>(mergedDeckConfig)
  const modulesOnDeck = currentDeckConfig.reduce<ModuleOnDeck[]>(
    (acc, cutoutConfig) => {
      const matchingFixtureIdsAndModel = Object.entries(
        MODULE_FIXTURES_BY_MODEL
      ).find(([_moduleModel, moduleFixtureIds]) =>
        moduleFixtureIds.includes(cutoutConfig.cutoutFixtureId)
      )
      if (matchingFixtureIdsAndModel != null) {
        const [matchingModel] = matchingFixtureIdsAndModel
        return [
          ...acc,
          {
            moduleModel: matchingModel as ModuleModel,
            moduleLocation: {
              slotName: FLEX_SINGLE_SLOT_BY_CUTOUT_ID[cutoutConfig.cutoutId],
            },
          },
        ]
      } else if (
        cutoutConfig.cutoutFixtureId ===
        STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE
      ) {
        return [
          ...acc,
          {
            moduleModel: MAGNETIC_BLOCK_V1_FIXTURE,
            moduleLocation: {
              slotName: FLEX_SINGLE_SLOT_BY_CUTOUT_ID[cutoutConfig.cutoutId],
            },
          },
        ]
      }
      return acc
    },
    []
  )

  const { updateDeckConfiguration } = useUpdateDeckConfigurationMutation()
  const handleClickConfirm = (): void => {
    updateDeckConfiguration(currentDeckConfig)
    setSetupScreen('modules')
  }

  return (
    <>
      {createPortal(
        <>
          {showDiscardChangeModal ? (
            <DeckConfigurationDiscardChangesModal
              setShowConfirmationModal={setShowDiscardChangeModal}
            />
          ) : null}
          {showConfigurationModal && cutoutId != null ? (
            <AddFixtureModal
              cutoutId={cutoutId}
              setShowAddFixtureModal={setShowConfigurationModal}
              providedFixtureOptions={providedFixtureOptions}
              setCurrentDeckConfig={setCurrentDeckConfig}
              isOnDevice
            />
          ) : null}
        </>,
        getTopPortalEl()
      )}
      <Flex flexDirection={DIRECTION_COLUMN}>
        <ChildNavigation
          header={t('devices_landing:deck_configuration')}
          onClickBack={() => setSetupScreen('modules')}
          buttonText={t('shared:confirm')}
          onClickButton={handleClickConfirm}
        />
        <Flex
          marginTop="4rem"
          paddingX={SPACING.spacing40}
          justifyContent={JUSTIFY_CENTER}
          height="28.4375rem"
        >
          <BaseDeck
            deckConfig={currentDeckConfig}
            robotType={FLEX_ROBOT_TYPE}
            modulesOnDeck={modulesOnDeck}
          />
        </Flex>
      </Flex>
    </>
  )
}
