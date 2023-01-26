import { InstrumentData } from '@opentrons/api-client'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { InstrumentCard } from '../../molecules/InstrumentCard'
import { GripperWizardFlows } from '../GripperWizardFlows'
import { GRIPPER_FLOW_TYPES } from '../GripperWizardFlows/constants'
import { GripperWizardFlowType } from '../GripperWizardFlows/types'

interface GripperCardProps {
  attachedGripper: InstrumentData | null
}

export function GripperCard({
  attachedGripper,
}: GripperCardProps): JSX.Element {
  const { t } = useTranslation(['device_details', 'shared'])
  const [
    openWizardFlowType,
    setOpenWizardFlowType,
  ] = React.useState<GripperWizardFlowType | null>(null)

  const handleAttach: React.MouseEventHandler<HTMLButtonElement> = () => {
    setOpenWizardFlowType(GRIPPER_FLOW_TYPES.ATTACH)
  }

  const handleDetach: React.MouseEventHandler<HTMLButtonElement> = () => {
    setOpenWizardFlowType(GRIPPER_FLOW_TYPES.DETACH)
  }

  const handleCalibrate: React.MouseEventHandler<HTMLButtonElement> = () => {
    setOpenWizardFlowType(GRIPPER_FLOW_TYPES.RECALIBRATE)
  }

  const menuOverlayItems =
    attachedGripper == null
      ? [
          {
            label: 'Attach gripper',
            disabled: attachedGripper != null,
            onClick: handleAttach,
          },
        ]
      : [
          {
            label: 'Recalibrate gripper',
            disabled: attachedGripper == null,
            onClick: handleCalibrate,
          },
          {
            label: 'Detach gripper',
            disabled: attachedGripper == null,
            onClick: handleDetach,
          },
        ]
  return (
    <>
      <InstrumentCard
        description={
          attachedGripper != null ? attachedGripper.instrumentModel : t('shared:empty')
        }
        isGripperAttached={attachedGripper != null}
        label={t('shared:extension_mount')}
        menuOverlayItems={menuOverlayItems}
      />
      {openWizardFlowType != null ? (
        <GripperWizardFlows
          flowType={openWizardFlowType}
          closeFlow={() => setOpenWizardFlowType(null)}
        />
      ) : null}
    </>
  )
}
