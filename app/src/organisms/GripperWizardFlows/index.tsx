import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useConditionalConfirm } from '@opentrons/components'
import {
  useHost,
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
import { Results } from './Success'
import { ExitConfirmation } from './ExitConfirmation'

import type { GripperWizardFlowType } from './types'

interface GripperWizardFlowsProps {
  flowType: GripperWizardFlowType
  robotName: string
  closeFlow: () => void
}

export const GripperWizardFlows = (
  props: GripperWizardFlowsProps
): JSX.Element | null => {
  const { flowType, closeFlow, robotName } = props
  const { t } = useTranslation('gripper_wizard_flows')
  const attachedGripper = {}
  const gripperWizardSteps = getGripperWizardSteps(flowType)
  const host = useHost()
  const [runId, setRunId] = React.useState<string>('')
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(0)
  const totalStepCount = gripperWizardSteps.length - 1
  const currentStep = gripperWizardSteps?.[currentStepIndex]

  const goBack = (): void => {
    setCurrentStepIndex(
      currentStepIndex !== gripperWizardSteps.length - 1
        ? currentStepIndex - 1
        : currentStepIndex
    )
  }
  const { chainRunCommands, isCommandMutationLoading } = useChainRunCommands(
    runId
  )

  const { createRun, isLoading: isCreateLoading } = useCreateRunMutation(
    {
      onSuccess: response => {
        setRunId(response.data.id)
      },
    },
    host
  )
  const { stopRun, isLoading: isStopLoading } = useStopRunMutation({
    onSuccess: () => {
      if (currentStep.section === SECTIONS.REMOVE_PIN) {
        proceed()
      } else {
        closeFlow()
      }
    },
  })

  const [isBetweenCommands, setIsBetweenCommands] = React.useState<boolean>(
    false
  )
  const [isExiting, setIsExiting] = React.useState<boolean>(false)

  const proceed = (): void => {
    if (
      !(
        isCommandMutationLoading ||
        isStopLoading ||
        isBetweenCommands ||
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
  const handleCleanUpAndClose = (): void => {
    setIsExiting(true)
    chainRunCommands([
      {
        commandType: 'home' as const,
        params: {},
      },
    ]).then(() => {
      setIsExiting(false)
      if (runId !== '') stopRun(runId)
    })
  }
  const {
    confirm: confirmExit,
    showConfirmation: showConfirmExit,
    cancel: cancelExit,
  } = useConditionalConfirm(handleCleanUpAndClose, true)

  const [isRobotMoving, setIsRobotMoving] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (
      isCommandMutationLoading ||
      isStopLoading ||
      isBetweenCommands ||
      isExiting
    ) {
      const timer = setTimeout(() => setIsRobotMoving(true), 700)
      return () => clearTimeout(timer)
    } else {
      setIsRobotMoving(false)
    }
  }, [isCommandMutationLoading, isStopLoading, isBetweenCommands, isExiting])

  const sharedProps = {
    flowType,
    runId,
    attachedGripper,
    proceed,
    goBack,
    isRobotMoving,
    chainRunCommands,
    setIsBetweenCommands,
    isBetweenCommands,
  }
  let onExit
  if (currentStep == null) return null
  let modalContent: JSX.Element = <div>UNASSIGNED STEP</div>
  if (showConfirmExit) {
    modalContent = (
      <ExitConfirmation goBack={cancelExit} proceed={confirmExit} flowType={flowType} />
    )
  } else if (currentStep.section === SECTIONS.BEFORE_BEGINNING) {
    onExit = handleCleanUpAndClose
    modalContent = (
      <BeforeBeginning
        {...currentStep}
        {...sharedProps}
        createRun={createRun}
        isCreateLoading={isCreateLoading}
      />
    )
  } else if (currentStep.section === SECTIONS.MOVE_PIN) {
    onExit = confirmExit
    modalContent = modalContent = (
      <MovePin
        {...currentStep}
        {...sharedProps}
        isExiting={isExiting}
      />
    )
  } else if (currentStep.section === SECTIONS.MOUNT_GRIPPER) {
    onExit = confirmExit
    modalContent = modalContent = (
      <MountGripper
        {...currentStep}
        {...sharedProps}
      />
    )
  } else if (currentStep.section === SECTIONS.UNMOUNT_GRIPPER) {
    onExit = confirmExit
    modalContent = modalContent = (
      <UnmountGripper
        {...currentStep}
        {...sharedProps}
      />
    )
  } else if (currentStep.section === SECTIONS.SUCCESS) {
    onExit = confirmExit
    modalContent = modalContent = (
      <Results {...currentStep} {...sharedProps} proceed={closeFlow} />
    )
  }

  const titleByFlowType: {[flowType in GripperWizardFlowType]: string} = {
    [GRIPPER_FLOW_TYPES.RECALIBRATE]: t('calibrate_a_gripper'),
    [GRIPPER_FLOW_TYPES.ATTACH]: t('attach_a_gripper'),
    [GRIPPER_FLOW_TYPES.DETACH]: t('detach_a_gripper')
  }
  const wizardTitle = titleByFlowType[flowType] ?? 'unknown page'
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
            title={wizardTitle}
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
