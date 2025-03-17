import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import {
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
  StyledText,
  ModalShell,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import type { VectorOffset } from '@opentrons/api-client'

import { SmallButton } from '/app/atoms/buttons'
import { JogControls } from '/app/molecules/JogControls'
import { getTopPortalEl } from '/app/App/portal'

import type { EditOffsetContentProps } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset'

export interface LPCJogControlsOddProps extends EditOffsetContentProps {
  toggleJogControls: () => void
  setJoggedPosition: (offset: VectorOffset) => void
}

export function LPCJogControlsOdd({
  toggleJogControls,
  setJoggedPosition,
  commandUtils,
}: LPCJogControlsOddProps): JSX.Element {
  const { handleJog } = commandUtils
  const { t } = useTranslation('labware_position_check')

  return createPortal(
    <ModalShell
      width="60rem"
      height="33.5rem"
      padding={SPACING.spacing32}
      display="flex"
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      header={
        <StyledText oddStyle="level4HeaderSemiBold">
          {t('move_to_a1_position')}
        </StyledText>
      }
      footer={
        <SmallButton
          width="100%"
          textTransform={TYPOGRAPHY.textTransformCapitalize}
          buttonText={t('shared:close')}
          onClick={toggleJogControls}
        />
      }
    >
      <JogControls
        jog={(axis, direction, step, _onSuccess) =>
          handleJog(axis, direction, step, setJoggedPosition)
        }
        isOnDevice={true}
      />
    </ModalShell>,
    getTopPortalEl()
  )
}
