import * as React from 'react'
import { createPortal } from 'react-dom'
import { Trans, useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import {
  useConditionalConfirm,
  Flex,
  DIRECTION_COLUMN,
  POSITION_ABSOLUTE,
  COLORS,
  BORDERS,
} from '@opentrons/components'
import {
  useCreateMaintenanceCommandMutation,
  useDeleteMaintenanceRunMutation,
  CreateMaintenanceRunType,
  useDeckConfigurationQuery,
} from '@opentrons/react-api-client'

import { useNotifyCurrentMaintenanceRun } from '../../resources/maintenance_runs'
import { LegacyModalShell } from '../../molecules/LegacyModal'
import { getTopPortalEl } from '../../App/portal'
import { WizardHeader } from '../../molecules/WizardHeader'
import { SimpleWizardBody } from '../../molecules/SimpleWizardBody'
import { getIsOnDevice } from '../../redux/config'
import {
  useChainMaintenanceCommands,
  useCreateTargetedMaintenanceRunMutation,
} from '../../resources/runs'
import { StyledText } from '../../atoms/text'
import { Jog } from '../../molecules/JogControls'
import { ExitConfirmation } from './ExitConfirmation'
import { getAddressableAreaFromConfig } from './getAddressableAreaFromConfig'
import { getDropTipWizardSteps } from './getDropTipWizardSteps'
import {
  BLOWOUT_SUCCESS,
  CHOOSE_BLOWOUT_LOCATION,
  CHOOSE_DROP_TIP_LOCATION,
  DROP_TIP_SUCCESS,
  POSITION_AND_BLOWOUT,
  POSITION_AND_DROP_TIP,
} from './constants'
import { BeforeBeginning } from './BeforeBeginning'
import { ChooseLocation } from './ChooseLocation'
import { JogToPosition } from './JogToPosition'
import { Success } from './Success'

import type { PipetteData } from '@opentrons/api-client'
import type {
  PipetteModelSpecs,
  RobotType,
  DeckConfiguration,
  AddressableAreaName,
} from '@opentrons/shared-data'
import type { Axis, Sign, StepSize } from '../../molecules/JogControls/types'

const RUN_REFETCH_INTERVAL_MS = 5000
const JOG_COMMAND_TIMEOUT_MS = 10000
const MANAGED_PIPETTE_ID = 'managedPipetteId'

interface MaintenanceRunManagerProps {
  robotType: RobotType
  mount: PipetteData['mount']
  instrumentModelSpecs: PipetteModelSpecs
  closeFlow: () => void
}
export function DropTipWizard(props: MaintenanceRunManagerProps): JSX.Element {
  const { closeFlow, mount, instrumentModelSpecs, robotType } = props
  const {
    chainRunCommands,
    isCommandMutationLoading: isChainCommandMutationLoading,
  } = useChainMaintenanceCommands()
  const { createMaintenanceCommand } = useCreateMaintenanceCommandMutation()

  const deckConfig = useDeckConfigurationQuery().data ?? []

  const [createdMaintenanceRunId, setCreatedMaintenanceRunId] = React.useState<
    string | null
  >(null)
  const hasCleanedUpAndClosed = React.useRef(false)

  // we should start checking for run deletion only after the maintenance run is created
  // and the useCurrentRun poll has returned that created id
  const [
    monitorMaintenanceRunForDeletion,
    setMonitorMaintenanceRunForDeletion,
  ] = React.useState<boolean>(false)

  const {
    createTargetedMaintenanceRun,
  } = useCreateTargetedMaintenanceRunMutation({
    onSuccess: response => {
      chainRunCommands(
        response.data.id,
        [
          {
            commandType: 'loadPipette',
            params: {
              pipetteId: MANAGED_PIPETTE_ID,
              mount: mount,
              pipetteName: instrumentModelSpecs.name,
            },
          },
        ],
        false
      )
        .then(() => {
          setCreatedMaintenanceRunId(response.data.id)
        })
        .catch(e => e)
    },
    onError: error => setErrorMessage(error.message),
  })

  const { data: maintenanceRunData } = useNotifyCurrentMaintenanceRun({
    refetchInterval: RUN_REFETCH_INTERVAL_MS,
    enabled: createdMaintenanceRunId != null,
  })

  // this will close the modal in case the run was deleted by the terminate
  // activity modal on the ODD
  React.useEffect(() => {
    if (
      createdMaintenanceRunId !== null &&
      maintenanceRunData?.data.id === createdMaintenanceRunId
    ) {
      setMonitorMaintenanceRunForDeletion(true)
    }
    if (
      maintenanceRunData?.data.id !== createdMaintenanceRunId &&
      monitorMaintenanceRunForDeletion
    ) {
      closeFlow()
    }
  }, [
    maintenanceRunData?.data.id,
    createdMaintenanceRunId,
    monitorMaintenanceRunForDeletion,
    closeFlow,
  ])

  const [isExiting, setIsExiting] = React.useState<boolean>(false)
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null)

  const { deleteMaintenanceRun } = useDeleteMaintenanceRunMutation({
    onSuccess: () => closeFlow(),
    onError: () => closeFlow(),
  })

  const handleCleanUpAndClose = (): void => {
    if (hasCleanedUpAndClosed.current) return

    hasCleanedUpAndClosed.current = true
    setIsExiting(true)
    if (maintenanceRunData?.data.id == null) {
      closeFlow()
    } else {
      chainRunCommands(
        maintenanceRunData?.data.id,
        [
          {
            commandType: 'home' as const,
            params: { axes: ['leftZ', 'rightZ', 'x', 'y'] },
          },
        ],
        true
      )
        .then(() => {
          deleteMaintenanceRun(maintenanceRunData?.data.id)
        })
        .catch(error => {
          console.error(error.message)
          deleteMaintenanceRun(maintenanceRunData?.data.id)
        })
    }
  }

  return (
    <DropTipWizardComponent
      robotType={robotType}
      createdMaintenanceRunId={createdMaintenanceRunId}
      maintenanceRunId={maintenanceRunData?.data.id}
      mount={mount}
      instrumentModelSpecs={instrumentModelSpecs}
      createMaintenanceRun={createTargetedMaintenanceRun}
      isRobotMoving={isChainCommandMutationLoading || isExiting}
      handleCleanUpAndClose={handleCleanUpAndClose}
      chainRunCommands={chainRunCommands}
      createRunCommand={createMaintenanceCommand}
      errorMessage={errorMessage}
      setErrorMessage={setErrorMessage}
      isExiting={isExiting}
      deckConfig={deckConfig}
    />
  )
}

interface DropTipWizardProps {
  robotType: RobotType
  mount: PipetteData['mount']
  createdMaintenanceRunId: string | null
  createMaintenanceRun: CreateMaintenanceRunType
  isRobotMoving: boolean
  isExiting: boolean
  setErrorMessage: (message: string | null) => void
  errorMessage: string | null
  handleCleanUpAndClose: () => void
  chainRunCommands: ReturnType<
    typeof useChainMaintenanceCommands
  >['chainRunCommands']
  createRunCommand: ReturnType<
    typeof useCreateMaintenanceCommandMutation
  >['createMaintenanceCommand']
  instrumentModelSpecs: PipetteModelSpecs
  deckConfig: DeckConfiguration
  maintenanceRunId?: string
}

export const DropTipWizardComponent = (
  props: DropTipWizardProps
): JSX.Element | null => {
  const {
    robotType,
    createMaintenanceRun,
    handleCleanUpAndClose,
    chainRunCommands,
    isRobotMoving,
    createRunCommand,
    setErrorMessage,
    errorMessage,
    isExiting,
    createdMaintenanceRunId,
    instrumentModelSpecs,
    deckConfig,
  } = props
  const isOnDevice = useSelector(getIsOnDevice)
  const { t, i18n } = useTranslation('drop_tip_wizard')

  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(0)
  const [shouldDispenseLiquid, setShouldDispenseLiquid] = React.useState<
    boolean | null
  >(null)
  const DropTipWizardSteps = getDropTipWizardSteps(shouldDispenseLiquid)
  const currentStep =
    shouldDispenseLiquid != null
      ? getDropTipWizardSteps(shouldDispenseLiquid)[currentStepIndex]
      : null
  const isFinalStep = currentStepIndex === DropTipWizardSteps.length - 1

  React.useEffect(() => {
    if (createdMaintenanceRunId == null) {
      createMaintenanceRun({}).catch((e: Error) =>
        setErrorMessage(`Error creating maintenance run: ${e.message}`)
      )
    }
  }, [])

  const goBack = (): void => {
    if (createdMaintenanceRunId != null) {
      setCurrentStepIndex(isFinalStep ? currentStepIndex : currentStepIndex - 1)
    }
  }

  const proceed = (): void => {
    if (isFinalStep) {
      handleCleanUpAndClose()
    } else {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handleJog: Jog = (axis: Axis, dir: Sign, step: StepSize): void => {
    if (createdMaintenanceRunId != null) {
      createRunCommand({
        maintenanceRunId: createdMaintenanceRunId,
        command: {
          commandType: 'moveRelative',
          params: { pipetteId: MANAGED_PIPETTE_ID, distance: step * dir, axis },
        },
        waitUntilComplete: true,
        timeout: JOG_COMMAND_TIMEOUT_MS,
      }).catch((e: Error) =>
        setErrorMessage(`Error issuing jog command: ${e.message}`)
      )
    }
  }

  const {
    confirm: confirmExit,
    showConfirmation: showConfirmExit,
    cancel: cancelExit,
  } = useConditionalConfirm(handleCleanUpAndClose, true)

  const moveToAddressableArea = (
    addressableArea: AddressableAreaName
  ): Promise<null> => {
    if (createdMaintenanceRunId == null) {
      return Promise.reject(
        new Error('no maintenance run present to send move commands to')
      )
    }

    const addressableAreaFromConfig = getAddressableAreaFromConfig(
      addressableArea,
      deckConfig,
      instrumentModelSpecs.channels,
      robotType
    )

    if (addressableAreaFromConfig != null) {
      return chainRunCommands(
        createdMaintenanceRunId,
        [
          {
            commandType: 'moveToAddressableArea',
            params: {
              pipetteId: MANAGED_PIPETTE_ID,
              stayAtHighestPossibleZ: true,
              addressableAreaName: addressableAreaFromConfig,
              offset: { x: 0, y: 0, z: 0 },
            },
          },
        ],
        true
      ).then(commandData => {
        const error = commandData[0].data.error
        if (error != null) {
          setErrorMessage(`error moving to position: ${error.detail}`)
        }
        return null
      })
    } else {
      setErrorMessage(`error moving to position: invalid addressable area.`)
      return Promise.resolve(null)
    }
  }

  let modalContent: JSX.Element = <div>UNASSIGNED STEP</div>
  if (showConfirmExit) {
    modalContent = (
      <ExitConfirmation
        handleGoBack={cancelExit}
        handleExit={() => {
          hasInitiatedExit.current = true
          confirmExit()
        }}
        isRobotMoving={isRobotMoving}
      />
    )
  } else if (errorMessage != null) {
    modalContent = (
      <SimpleWizardBody
        isSuccess={false}
        iconColor={COLORS.red50}
        header={t('error_dropping_tips')}
        subHeader={
          <>
            {t('drop_tip_failed')}
            {errorMessage}
          </>
        }
      />
    )
  } else if (shouldDispenseLiquid == null) {
    modalContent = (
      <BeforeBeginning
        {...{
          setShouldDispenseLiquid,
          createdMaintenanceRunId,
          isOnDevice,
          isRobotMoving,
        }}
      />
    )
  } else if (
    currentStep === CHOOSE_BLOWOUT_LOCATION ||
    currentStep === CHOOSE_DROP_TIP_LOCATION
  ) {
    let bodyTextKey
    if (currentStep === CHOOSE_BLOWOUT_LOCATION) {
      bodyTextKey = isOnDevice
        ? 'select_blowout_slot_odd'
        : 'select_blowout_slot'
    } else {
      bodyTextKey = isOnDevice
        ? 'select_drop_tip_slot_odd'
        : 'select_drop_tip_slot'
    }
    modalContent = (
      <ChooseLocation
        robotType={robotType}
        handleProceed={proceed}
        handleGoBack={() => {
          setCurrentStepIndex(0)
          setShouldDispenseLiquid(null)
        }}
        title={
          currentStep === CHOOSE_BLOWOUT_LOCATION
            ? i18n.format(t('choose_blowout_location'), 'capitalize')
            : i18n.format(t('choose_drop_tip_location'), 'capitalize')
        }
        body={
          <Trans
            t={t}
            i18nKey={bodyTextKey}
            components={{ block: <StyledText as="p" /> }}
          />
        }
        moveToAddressableArea={moveToAddressableArea}
        isRobotMoving={isRobotMoving}
        isOnDevice={isOnDevice}
        setErrorMessage={setErrorMessage}
      />
    )
  } else if (
    currentStep === POSITION_AND_BLOWOUT ||
    currentStep === POSITION_AND_DROP_TIP
  ) {
    modalContent = (
      <JogToPosition
        handleJog={handleJog}
        handleProceed={() => {
          if (createdMaintenanceRunId != null) {
            chainRunCommands(
              createdMaintenanceRunId,
              [
                currentStep === POSITION_AND_BLOWOUT
                  ? {
                      commandType: 'blowOutInPlace',
                      params: {
                        pipetteId: MANAGED_PIPETTE_ID,
                        flowRate:
                          instrumentModelSpecs.defaultBlowOutFlowRate.value,
                      },
                    }
                  : {
                      commandType: 'dropTipInPlace',
                      params: { pipetteId: MANAGED_PIPETTE_ID },
                    },
              ],
              true
            )
              .then(commandData => {
                const error = commandData[0].data.error
                if (error != null) {
                  setErrorMessage(`error moving to position: ${error.detail}`)
                } else proceed()
              })
              .catch(e =>
                setErrorMessage(
                  `Error issuing ${
                    currentStep === POSITION_AND_BLOWOUT
                      ? 'blowout'
                      : 'drop tip'
                  } command: ${e.message}`
                )
              )
          }
        }}
        isRobotMoving={isRobotMoving}
        handleGoBack={goBack}
        body={
          currentStep === POSITION_AND_BLOWOUT
            ? t('position_and_blowout')
            : t('position_and_drop_tip')
        }
        currentStep={currentStep}
        isOnDevice={isOnDevice}
      />
    )
  } else if (
    currentStep === BLOWOUT_SUCCESS ||
    currentStep === DROP_TIP_SUCCESS
  ) {
    modalContent = (
      <Success
        message={
          currentStep === BLOWOUT_SUCCESS
            ? t('blowout_complete')
            : t('drop_tip_complete')
        }
        handleProceed={
          currentStep === BLOWOUT_SUCCESS ? proceed : handleCleanUpAndClose
        }
        proceedText={
          currentStep === BLOWOUT_SUCCESS
            ? i18n.format(t('shared:continue'), 'capitalize')
            : i18n.format(t('shared:exit'), 'capitalize')
        }
        isExiting={isExiting}
        isOnDevice={isOnDevice}
      />
    )
  }

  const hasInitiatedExit = React.useRef(false)
  let handleExit: () => void = () => null
  if (!hasInitiatedExit.current) handleExit = confirmExit
  else if (errorMessage != null) handleExit = handleCleanUpAndClose

  const wizardHeader = (
    <WizardHeader
      title={i18n.format(t('drop_tips'), 'capitalize')}
      currentStep={shouldDispenseLiquid != null ? currentStepIndex + 1 : null}
      totalSteps={DropTipWizardSteps.length}
      onExit={
        currentStepIndex === DropTipWizardSteps.length - 1
          ? handleCleanUpAndClose
          : handleExit
      }
    />
  )

  return createPortal(
    isOnDevice ? (
      <Flex
        flexDirection={DIRECTION_COLUMN}
        width="992px"
        height="568px"
        left="14.5px"
        top="16px"
        border={BORDERS.lineBorder}
        boxShadow={BORDERS.shadowSmall}
        borderRadius={BORDERS.borderRadius16}
        position={POSITION_ABSOLUTE}
        backgroundColor={COLORS.white}
      >
        {wizardHeader}
        {modalContent}
      </Flex>
    ) : (
      <LegacyModalShell width="47rem" header={wizardHeader} overflow="hidden">
        {modalContent}
      </LegacyModalShell>
    ),
    getTopPortalEl()
  )
}
