import { Trans, useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { useSelector } from 'react-redux'

import { LegacyStyledText } from '@opentrons/components'

import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import { selectActivePipetteChannelCount } from '/app/redux/protocol-runs'
import { DescriptionContent, TwoColumn } from '/app/molecules/InterventionModal'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

import attachProbe1 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_1.webm'
import attachProbe8 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_8.webm'
import attachProbe96 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_96.webm'

export function DetachProbe(props: LPCWizardContentProps): JSX.Element {
  const { proceedStep, goBackLastStep } = props
  const { t } = useTranslation('labware_position_check')

  const channelCount = useSelector(selectActivePipetteChannelCount(props.runId))

  const probeVideo = (): string => {
    switch (channelCount) {
      case 1:
        return attachProbe1
      case 8:
        return attachProbe8
      case 96:
        return attachProbe96
      default: {
        console.error('Unexpected channel count.')
        return attachProbe1
      }
    }
  }

  return (
    <LPCContentContainer
      {...props}
      header={t('labware_position_check_title')}
      buttonText={t('confirm_removal')}
      onClickButton={() => {
        proceedStep()
      }}
      onClickBack={goBackLastStep}
    >
      <TwoColumn>
        <DescriptionContent
          headline={t('detach_probe')}
          message={
            <Trans
              t={t}
              i18nKey="store_probe"
              components={{ block: <LegacyStyledText as="p" /> }}
            />
          }
        />
        <StyledVideo
          autoPlay
          loop
          controls={false}
          src={probeVideo()}
          data-testid="probe-video"
        />
      </TwoColumn>
    </LPCContentContainer>
  )
}

const StyledVideo = styled.video`
  height: 100%;
  width: 100%;
`
