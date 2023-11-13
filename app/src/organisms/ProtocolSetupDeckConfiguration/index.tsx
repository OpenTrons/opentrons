import * as React from 'react'
import { useTranslation } from 'react-i18next'

import {
  BaseDeck,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  SPACING,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { useCreateDeckConfigurationMutation } from '@opentrons/react-api-client'

import { ChildNavigation } from '../ChildNavigation'
import { AddFixtureModal } from '../DeviceDetailsDeckConfiguration/AddFixtureModal'
import { DeckConfigurationDiscardChangesModal } from '../DeviceDetailsDeckConfiguration/DeckConfigurationDiscardChangesModal'
import { useMostRecentCompletedAnalysis } from '../LabwarePositionCheck/useMostRecentCompletedAnalysis'
import { getSimplestDeckConfigForProtocolCommands } from '../../resources/deck_configuration/utils'
import { Portal } from '../../App/portal'

import type {
  Cutout,
  DeckConfiguration,
  FixtureLoadName,
} from '@opentrons/shared-data'
import type { SetupScreens } from '../../pages/OnDeviceDisplay/ProtocolSetup'

interface ProtocolSetupDeckConfigurationProps {
  fixtureLocation: Cutout
  runId: string
  setSetupScreen: React.Dispatch<React.SetStateAction<SetupScreens>>
  providedFixtureOptions: FixtureLoadName[]
}

export function ProtocolSetupDeckConfiguration({
  fixtureLocation,
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

  const simplestDeckConfig = getSimplestDeckConfigForProtocolCommands(
    mostRecentAnalysis?.commands ?? []
  ).map(({ cutoutId, cutoutFixtureId }) => ({ cutoutId, cutoutFixtureId }))

  const [
    currentDeckConfig,
    setCurrentDeckConfig,
  ] = React.useState<DeckConfiguration>(simplestDeckConfig)

  const { createDeckConfiguration } = useCreateDeckConfigurationMutation()
  const handleClickConfirm = (): void => {
    createDeckConfiguration(currentDeckConfig)
    setSetupScreen('modules')
  }

  return (
    <>
      <Portal level="top">
        {showDiscardChangeModal ? (
          <DeckConfigurationDiscardChangesModal
            setShowConfirmationModal={setShowDiscardChangeModal}
          />
        ) : null}
        {showConfigurationModal && fixtureLocation != null ? (
          <AddFixtureModal
            fixtureLocation={fixtureLocation}
            setShowAddFixtureModal={setShowConfigurationModal}
            providedFixtureOptions={providedFixtureOptions}
            setCurrentDeckConfig={setCurrentDeckConfig}
            isOnDevice
          />
        ) : null}
      </Portal>
      <Flex flexDirection={DIRECTION_COLUMN}>
        <ChildNavigation
          header={t('devices_landing:deck_configuration')}
          onClickBack={() => setSetupScreen('modules')}
          buttonText={t('shared:confirm')}
          onClickButton={handleClickConfirm}
        />
        <Flex
          marginTop="7.75rem"
          paddingX={SPACING.spacing40}
          justifyContent={JUSTIFY_CENTER}
        >
          <BaseDeck
            deckConfig={simplestDeckConfig}
            robotType={FLEX_ROBOT_TYPE}
          />
        </Flex>
      </Flex>
    </>
  )
}
