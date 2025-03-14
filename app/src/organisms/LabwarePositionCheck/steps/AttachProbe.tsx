import { Trans, useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { LegacyStyledText } from '@opentrons/components'

import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import { DescriptionContent, TwoColumn } from '/app/molecules/InterventionModal'
import { selectActivePipetteChannelCount } from '/app/redux/protocol-runs'

import attachProbe1 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_1.webm'
import attachProbe8 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_8.webm'
import attachProbe96 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_96.webm'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import styled from 'styled-components'

export function AttachProbe(props: LPCWizardContentProps): JSX.Element {
  const {
    handleAttachProbeCheck,
    handleNavToDetachProbe,
  } = props.commandUtils.headerCommands
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

  const probei18nString = (): string => {
    switch (channelCount) {
      case 1:
        return 'install_probe_1ch'
      case 8:
        return 'install_probe_8ch'
      case 96:
        return 'install_probe_96ch'
      default: {
        console.error('Unexpected channel count.')
        return 'install_probe_1ch'
      }
    }
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
      <TwoColumn>
        <DescriptionContent
          headline={t('attach_probe')}
          message={
            <Trans
              t={t}
              i18nKey={probei18nString()}
              components={{
                block: <LegacyStyledText as="p" />,
                bold: <strong />,
              }}
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
