import * as React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  Box,
  Btn,
  C_BLUE,
  Link,
  SPACING_2,
  JUSTIFY_CENTER,
  FONT_SIZE_BODY_2,
} from '@opentrons/components'
import { LabwarePositionCheckStepDetailModal } from './LabwarePositionCheckStepDetailModal'
import type { LabwarePositionCheckStep } from './types'
import { useProtocolDetailsForRun } from '../Devices/hooks'

interface StepDetailTextProps {
  selectedStep: LabwarePositionCheckStep
  runId: string
  pipetteChannels?: 1 | 8
}
export const StepDetailText = (
  props: StepDetailTextProps
): JSX.Element | null => {
  const { labwareId } = props.selectedStep
  const { pipetteChannels, runId } = props
  const { t } = useTranslation('labware_position_check')
  const { protocolData } = useProtocolDetailsForRun(runId)
  const [
    showLabwarePositionCheckStepDetailModal,
    setLabwarePositionCheckStepDetailModal,
  ] = React.useState<boolean>(false)
  if (protocolData == null) return null
  const labwareDefId = protocolData.labware[labwareId].definitionId
  const labwareDef = protocolData.labwareDefinitions[labwareDefId]
  const { displayName } = labwareDef.metadata
  const { isTiprack } = labwareDef.parameters

  return (
    <React.Fragment>
      {showLabwarePositionCheckStepDetailModal && (
        <LabwarePositionCheckStepDetailModal
          onCloseClick={() => setLabwarePositionCheckStepDetailModal(false)}
        />
      )}
      <Box
        padding={SPACING_2}
        justifyContent={JUSTIFY_CENTER}
        fontSize={FONT_SIZE_BODY_2}
      >
        <Trans
          t={t}
          i18nKey={
            isTiprack
              ? 'labware_step_detail_tiprack'
              : 'labware_step_detail_labware'
          }
          count={pipetteChannels}
          values={{ labware_name: displayName, tiprack_name: displayName }}
          components={{
            bold: <strong />,
            italic: <i />,
          }}
        />
        <Btn
          as={Link}
          color={C_BLUE}
          marginLeft="0.1rem"
          onClick={() => setLabwarePositionCheckStepDetailModal(true)}
          id="StepDetailText_link"
        >
          {t('labware_step_detail_link')}
        </Btn>
      </Box>
    </React.Fragment>
  )
}
