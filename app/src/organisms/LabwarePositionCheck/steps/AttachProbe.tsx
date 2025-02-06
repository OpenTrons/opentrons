import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import { LPC_STEP, selectActivePipette } from '/app/redux/protocol-runs'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export function AttachProbe(props: LPCWizardContentProps): JSX.Element {
  const { commandUtils, proceedStep, runId } = props
  const {
    toggleRobotMoving,
    handleValidMoveToMaintenancePosition,
    handleProbeAttachment,
  } = commandUtils
  const { t } = useTranslation('labware_position_check')
  const pipette = useSelector(selectActivePipette(runId))

  // TOME TODO: The onClicks are duped. Consolidate them.
  const handleAttachProbeCheck = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleProbeAttachment(pipette, proceedStep))
      .then(() => {
        proceedStep()
      })
      .finally(() => toggleRobotMoving(false))
  }

  const handleNavToDetachProbe = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleValidMoveToMaintenancePosition(pipette))
      .then(() => {
        proceedStep(LPC_STEP.DETACH_PROBE)
      })
      .finally(() => toggleRobotMoving(false))
  }

  return (
    <LPCContentContainer
      {...props}
      header={t('labware_position_check_title')}
      onClickButton={handleAttachProbeCheck}
      buttonText={t('continue')}
      secondaryButtonProps={{
        buttonText: t('exit'),
        buttonCategory: 'rounded',
        buttonType: 'tertiaryLowLight',
        onClick: handleNavToDetachProbe,
      }}
    >
      <div>PLACEHOLDER ATTACH PROBE</div>
    </LPCContentContainer>
  )
}
