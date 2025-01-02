import { useState, useReducer } from 'react'
import { createPortal } from 'react-dom'
import isEqual from 'lodash/isEqual'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { useConditionalConfirm, ModalShell } from '@opentrons/components'
import {
  useCreateLabwareOffsetMutation,
  useCreateMaintenanceCommandMutation,
} from '@opentrons/react-api-client'
import { FIXED_TRASH_ID, FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { getTopPortalEl } from '/app/App/portal'
// import { useTrackEvent } from '/app/redux/analytics'
import { IntroScreen } from './IntroScreen'
import { ExitConfirmation } from './ExitConfirmation'
import { CheckItem } from './CheckItem'
import { WizardHeader } from '/app/molecules/WizardHeader'
import { getIsOnDevice } from '/app/redux/config'
import { AttachProbe } from './AttachProbe'
import { DetachProbe } from './DetachProbe'
import { PickUpTip } from './PickUpTip'
import { ReturnTip } from './ReturnTip'
import { ResultsSummary } from './ResultsSummary'
import { FatalError } from './FatalErrorModal'
import { RobotMotionLoader } from './RobotMotionLoader'
import { useChainMaintenanceCommands } from '/app/resources/maintenance_runs'
import { getLabwarePositionCheckSteps } from './getLabwarePositionCheckSteps'

import type {
  Coordinates,
  CreateCommand,
  DropTipCreateCommand,
} from '@opentrons/shared-data'
import type {
  LabwareOffsetCreateData,
  CommandData,
} from '@opentrons/api-client'
import type { Axis, Sign, StepSize } from '/app/molecules/JogControls/types'
import type { RegisterPositionAction, WorkingOffset } from './types'
import type { LPCFlowsProps } from '/app/organisms/LabwarePositionCheck/LPCFlows'

const JOG_COMMAND_TIMEOUT = 10000 // 10 seconds

export const LPCWizardFlex = (props: LPCFlowsProps): JSX.Element | null => {
  const {
    mostRecentAnalysis,
    existingOffsets,
    robotType,
    runId,
    onCloseClick,
    protocolName,
    maintenanceRunId,
  } = props
  const { t } = useTranslation(['labware_position_check', 'shared'])
  const isOnDevice = useSelector(getIsOnDevice)
  const protocolData = mostRecentAnalysis
  const shouldUseMetalProbe = robotType === FLEX_ROBOT_TYPE

  const [fatalError, setFatalError] = useState<string | null>(null)
  const [isApplyingOffsets, setIsApplyingOffsets] = useState<boolean>(false)
  const [{ workingOffsets, tipPickUpOffset }, registerPosition] = useReducer(
    (
      state: {
        workingOffsets: WorkingOffset[]
        tipPickUpOffset: Coordinates | null
      },
      action: RegisterPositionAction
    ) => {
      if (action.type === 'tipPickUpOffset') {
        return { ...state, tipPickUpOffset: action.offset }
      }

      if (
        action.type === 'initialPosition' ||
        action.type === 'finalPosition'
      ) {
        const { labwareId, location, position } = action
        const existingRecordIndex = state.workingOffsets.findIndex(
          record =>
            record.labwareId === labwareId && isEqual(record.location, location)
        )
        if (existingRecordIndex >= 0) {
          if (action.type === 'initialPosition') {
            return {
              ...state,
              workingOffsets: [
                ...state.workingOffsets.slice(0, existingRecordIndex),
                {
                  ...state.workingOffsets[existingRecordIndex],
                  initialPosition: position,
                  finalPosition: null,
                },
                ...state.workingOffsets.slice(existingRecordIndex + 1),
              ],
            }
          } else if (action.type === 'finalPosition') {
            return {
              ...state,
              workingOffsets: [
                ...state.workingOffsets.slice(0, existingRecordIndex),
                {
                  ...state.workingOffsets[existingRecordIndex],
                  finalPosition: position,
                },
                ...state.workingOffsets.slice(existingRecordIndex + 1),
              ],
            }
          }
        }
        return {
          ...state,
          workingOffsets: [
            ...state.workingOffsets,
            {
              labwareId,
              location,
              initialPosition:
                action.type === 'initialPosition' ? position : null,
              finalPosition: action.type === 'finalPosition' ? position : null,
            },
          ],
        }
      } else {
        return state
      }
    },
    { workingOffsets: [], tipPickUpOffset: null }
  )
  const [isExiting, setIsExiting] = useState(false)
  const {
    createMaintenanceCommand: createSilentCommand,
  } = useCreateMaintenanceCommandMutation()
  const {
    chainRunCommands,
    isCommandMutationLoading: isCommandChainLoading,
  } = useChainMaintenanceCommands()

  const { createLabwareOffset } = useCreateLabwareOffsetMutation()
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const handleCleanUpAndClose = (): void => {
    setIsExiting(true)
    const dropTipToBeSafeCommands: DropTipCreateCommand[] = shouldUseMetalProbe
      ? []
      : (protocolData?.pipettes ?? []).map(pip => ({
          commandType: 'dropTip' as const,
          params: {
            pipetteId: pip.id,
            labwareId: FIXED_TRASH_ID,
            wellName: 'A1',
            wellLocation: { origin: 'default' as const },
          },
        }))
    chainRunCommands(
      maintenanceRunId,
      [
        {
          commandType: 'retractAxis' as const,
          params: {
            axis: 'leftZ',
          },
        },
        {
          commandType: 'retractAxis' as const,
          params: {
            axis: 'rightZ',
          },
        },
        {
          commandType: 'retractAxis' as const,
          params: { axis: 'x' },
        },
        {
          commandType: 'retractAxis' as const,
          params: { axis: 'y' },
        },
        ...dropTipToBeSafeCommands,
        { commandType: 'home' as const, params: {} },
      ],
      true
    )
      .then(() => {
        props.onCloseClick()
      })
      .catch(() => {
        props.onCloseClick()
      })
  }
  const {
    confirm: confirmExitLPC,
    showConfirmation,
    cancel: cancelExitLPC,
  } = useConditionalConfirm(handleCleanUpAndClose, true)

  const proceed = (): void => {
    setCurrentStepIndex(
      currentStepIndex !== LPCSteps.length - 1
        ? currentStepIndex + 1
        : currentStepIndex
    )
  }
  if (protocolData == null) return null
  const LPCSteps = getLabwarePositionCheckSteps(
    protocolData,
    shouldUseMetalProbe
  )
  const totalStepCount = LPCSteps.length - 1
  const currentStep = LPCSteps?.[currentStepIndex]
  if (currentStep == null) return null

  const protocolHasModules = protocolData.modules.length > 0

  const handleJog = (
    axis: Axis,
    dir: Sign,
    step: StepSize,
    onSuccess?: (position: Coordinates | null) => void
  ): void => {
    const pipetteId = 'pipetteId' in currentStep ? currentStep.pipetteId : null
    if (pipetteId != null) {
      createSilentCommand({
        maintenanceRunId,
        command: {
          commandType: 'moveRelative',
          params: { pipetteId, distance: step * dir, axis },
        },
        waitUntilComplete: true,
        timeout: JOG_COMMAND_TIMEOUT,
      })
        .then(data => {
          onSuccess?.(
            (data?.data?.result?.position ?? null) as Coordinates | null
          )
        })
        .catch((e: Error) => {
          setFatalError(`error issuing jog command: ${e.message}`)
        })
    } else {
      setFatalError(`could not find pipette to jog with id: ${pipetteId ?? ''}`)
    }
  }
  const chainMaintenanceRunCommands = (
    commands: CreateCommand[],
    continuePastCommandFailure: boolean
  ): Promise<CommandData[]> =>
    chainRunCommands(maintenanceRunId, commands, continuePastCommandFailure)
  const movementStepProps = {
    proceed,
    protocolData,
    chainRunCommands: chainMaintenanceRunCommands,
    setFatalError,
    registerPosition,
    handleJog,
    isRobotMoving: isCommandChainLoading,
    workingOffsets,
    existingOffsets,
    robotType,
  }

  const handleApplyOffsets = (offsets: LabwareOffsetCreateData[]): void => {
    setIsApplyingOffsets(true)
    Promise.all(offsets.map(data => createLabwareOffset({ runId, data })))
      .then(() => {
        onCloseClick()
      })
      .catch((e: Error) => {
        setFatalError(`error applying labware offsets: ${e.message}`)
      })
  }

  let modalContent: JSX.Element = <div>UNASSIGNED STEP</div>
  if (isExiting) {
    modalContent = (
      <RobotMotionLoader header={t('shared:stand_back_robot_is_in_motion')} />
    )
  } else if (fatalError != null) {
    modalContent = (
      <FatalError
        errorMessage={fatalError}
        shouldUseMetalProbe={shouldUseMetalProbe}
        onClose={onCloseClick}
      />
    )
  } else if (showConfirmation) {
    modalContent = (
      <ExitConfirmation
        onGoBack={cancelExitLPC}
        onConfirmExit={confirmExitLPC}
        shouldUseMetalProbe={shouldUseMetalProbe}
      />
    )
  } else if (currentStep.section === 'BEFORE_BEGINNING') {
    modalContent = (
      <IntroScreen
        {...movementStepProps}
        {...{ existingOffsets }}
        protocolName={protocolName}
        shouldUseMetalProbe={shouldUseMetalProbe}
      />
    )
  } else if (
    currentStep.section === 'CHECK_POSITIONS' ||
    currentStep.section === 'CHECK_TIP_RACKS' ||
    currentStep.section === 'CHECK_LABWARE'
  ) {
    modalContent = (
      <CheckItem
        {...currentStep}
        {...movementStepProps}
        shouldUseMetalProbe={shouldUseMetalProbe}
      />
    )
  } else if (currentStep.section === 'ATTACH_PROBE') {
    modalContent = (
      <AttachProbe
        {...currentStep}
        {...movementStepProps}
        isOnDevice={isOnDevice}
      />
    )
  } else if (currentStep.section === 'DETACH_PROBE') {
    modalContent = <DetachProbe {...currentStep} {...movementStepProps} />
  } else if (currentStep.section === 'PICK_UP_TIP') {
    modalContent = (
      <PickUpTip
        {...currentStep}
        {...movementStepProps}
        protocolHasModules={protocolHasModules}
        currentStepIndex={currentStepIndex}
      />
    )
  } else if (currentStep.section === 'RETURN_TIP') {
    modalContent = (
      <ReturnTip
        {...currentStep}
        {...movementStepProps}
        {...{ tipPickUpOffset }}
      />
    )
  } else if (currentStep.section === 'RESULTS_SUMMARY') {
    modalContent = (
      <ResultsSummary
        {...currentStep}
        protocolData={protocolData}
        {...{
          workingOffsets,
          existingOffsets,
          handleApplyOffsets,
          isApplyingOffsets,
        }}
      />
    )
  }
  const wizardHeader = (
    <WizardHeader
      title={t('labware_position_check_title')}
      currentStep={fatalError != null ? undefined : currentStepIndex}
      totalSteps={fatalError != null ? undefined : totalStepCount}
      onExit={
        showConfirmation || isExiting || fatalError != null
          ? undefined
          : confirmExitLPC
      }
    />
  )
  return createPortal(
    isOnDevice ? (
      <ModalShell fullPage>
        {wizardHeader}
        {modalContent}
      </ModalShell>
    ) : (
      <ModalShell width="47rem" header={wizardHeader}>
        {modalContent}
      </ModalShell>
    ),
    getTopPortalEl()
  )
}
