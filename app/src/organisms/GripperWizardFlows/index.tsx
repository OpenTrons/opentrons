import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { UseMutateFunction } from 'react-query'
import { useConditionalConfirm } from '@opentrons/components'
import {
  useCreateRunMutation,
  useStopRunMutation,
} from '@opentrons/react-api-client'
import { ModalShell } from '../../molecules/Modal'
import { Portal } from '../../App/portal'
import { WizardHeader } from '../../molecules/WizardHeader'
import { useChainRunCommands } from '../../resources/runs/hooks'
import { getGripperWizardSteps } from './getGripperWizardSteps'
import { GRIPPER_FLOW_TYPES, SECTIONS } from './constants'
import { BeforeBeginning } from './BeforeBeginning'
import { MovePin } from './MovePin'
import { MountGripper } from './MountGripper'
import { UnmountGripper } from './UnmountGripper'
import { Success } from './Success'
import { ExitConfirmation } from './ExitConfirmation'

import type { GripperWizardFlowType } from './types'
import type { AxiosError } from 'axios'
import type { Run, CreateRunData, InstrumentData } from '@opentrons/api-client'


interface MaintenanceRunManagerProps {
  flowType: GripperWizardFlowType
  attachedGripper: InstrumentData | null
  closeFlow: () => void
}
export function GripperWizardFlows(props: MaintenanceRunManagerProps): JSX.Element {
  const { flowType, closeFlow, attachedGripper } = props
  const gripperWizardSteps = getGripperWizardSteps(flowType)
  const [runId, setRunId] = React.useState<string>('')
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(0)

  const { chainRunCommands, isCommandMutationLoading } = useChainRunCommands(runId)

  const { createRun, isLoading: isCreateLoading } = useCreateRunMutation({
    onSuccess: response => {
      setRunId(response.data.id)
    },
  })
  const { stopRun, isLoading: isStopLoading } = useStopRunMutation({
    onSuccess: closeFlow,
  })
  const [isExiting, setIsExiting] = React.useState<boolean>(false)

  const proceed = (): void => {
    if (
      !(
        isCommandMutationLoading ||
        isStopLoading ||
        isExiting
      )
    ) {
      setCurrentStepIndex(
        currentStepIndex !== gripperWizardSteps.length - 1
          ? currentStepIndex + 1
          : currentStepIndex
      )
    }
  }

  const [isRobotMoving, setIsRobotMoving] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (
      isCommandMutationLoading ||
      isStopLoading ||
      isExiting
    ) {
      const timer = setTimeout(() => setIsRobotMoving(true), 700)
      return () => clearTimeout(timer)
    } else {
      setIsRobotMoving(false)
    }
  }, [isCommandMutationLoading, isStopLoading, isExiting])


  const handleCleanUpAndClose = (): void => {
    setIsExiting(true)
    chainRunCommands([{ commandType: 'home' as const, params: {} }], true).then(() => {
      setIsExiting(false)
      if (runId !== '') stopRun(runId)
    })
    if (runId !== '') stopRun(runId)
  }

  return (
    <GripperWizard
      flowType={flowType}
      runId={runId}
      attachedGripper={attachedGripper}
      createRun={createRun}
      isCreateLoading={isCreateLoading}
      isRobotMoving={isRobotMoving}
      handleCleanUpAndClose={handleCleanUpAndClose}
      chainRunCommands={chainRunCommands}
      proceed={proceed}
    />
  )
}

interface GripperWizardProps {
  flowType: GripperWizardFlowType
  runId: string
  attachedGripper: InstrumentData | null
  createRun: UseMutateFunction<Run, AxiosError<any>, CreateRunData, unknown>
  isCreateLoading: boolean
  isRobotMoving: boolean
  handleCleanUpAndClose: () => void
  chainRunCommands: ReturnType<typeof useChainRunCommands>['chainRunCommands']
  proceed: () => void
}

export const GripperWizard = (
  props: GripperWizardProps
): JSX.Element | null => {
  const { flowType, runId, createRun, handleCleanUpAndClose, chainRunCommands, proceed, attachedGripper, isCreateLoading, isRobotMoving } = props
  const { t } = useTranslation('gripper_wizard_flows')
  const gripperWizardSteps = getGripperWizardSteps(flowType)
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(0)
  const totalStepCount = gripperWizardSteps.length - 1
  const currentStep = gripperWizardSteps?.[currentStepIndex]
  const isFinalStep = currentStepIndex === gripperWizardSteps.length - 1

  const goBack = (): void => {
    setCurrentStepIndex(isFinalStep ? currentStepIndex : currentStepIndex - 1)
  }

  const handleProceed = (): void => {
    proceed()
    setCurrentStepIndex(
      currentStepIndex !== gripperWizardSteps.length - 1
        ? currentStepIndex + 1
        : currentStepIndex
    )
  }

  const {
    confirm: confirmExit,
    showConfirmation: showConfirmExit,
    cancel: cancelExit,
  } = useConditionalConfirm(handleCleanUpAndClose, true)

  const sharedProps = {
    flowType,
    runId,
    isCreateLoading,
    isRobotMoving,
    attachedGripper,
    proceed: handleProceed,
    goBack,
    chainRunCommands,
  }
  let onExit
  if (currentStep == null) return null
  let modalContent: JSX.Element = <div>UNASSIGNED STEP</div>
  if (showConfirmExit) {
    modalContent = (
      <ExitConfirmation
        handleGoBack={cancelExit}
        handleExit={confirmExit}
        flowType={flowType}
      />
    )
  } else if (currentStep.section === SECTIONS.BEFORE_BEGINNING) {
    onExit = handleCleanUpAndClose
    modalContent = (
      <BeforeBeginning
        {...currentStep}
        {...sharedProps}
        createRun={createRun}
      />
    )
  } else if (currentStep.section === SECTIONS.MOVE_PIN) {
    onExit = confirmExit
    modalContent = modalContent = (
      <MovePin {...currentStep} {...sharedProps} />
    )
  } else if (currentStep.section === SECTIONS.MOUNT_GRIPPER) {
    onExit = confirmExit
    modalContent = modalContent = (
      <MountGripper {...currentStep} {...sharedProps} />
    )
  } else if (currentStep.section === SECTIONS.UNMOUNT_GRIPPER) {
    onExit = confirmExit
    modalContent = modalContent = (
      <UnmountGripper {...currentStep} {...sharedProps} />
    )
  } else if (currentStep.section === SECTIONS.SUCCESS) {
    onExit = confirmExit
    modalContent = modalContent = (
      <Success {...currentStep} proceed={isFinalStep ? handleCleanUpAndClose : proceed} />
    )
  }

  const titleByFlowType: { [flowType in GripperWizardFlowType]: string } = {
    [GRIPPER_FLOW_TYPES.RECALIBRATE]: t('calibrate_gripper'),
    [GRIPPER_FLOW_TYPES.ATTACH]: t('attach_gripper'),
    [GRIPPER_FLOW_TYPES.DETACH]: t('detach_gripper'),
  }
  let handleExit = onExit
  if (isRobotMoving) {
    handleExit = undefined
  } else if (showConfirmExit) {
    handleExit = handleCleanUpAndClose
  }

  return (
    <Portal level="top">
      <ModalShell
        width="48rem"
        header={
          <WizardHeader
            title={titleByFlowType[flowType]}
            currentStep={currentStepIndex}
            totalSteps={totalStepCount}
            onExit={handleExit}
          />
        }
      >
        {modalContent}
      </ModalShell>
    </Portal>
  )
}
