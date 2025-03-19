import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { DIRECTION_COLUMN, Flex } from '@opentrons/components'

import { useToaster } from '/app/organisms/ToasterOven'
import { FloatingActionButton } from '/app/atoms/buttons'
import { SetupOffsetsTable } from './SetupOffsetsTable'
import { SetupOffsetsHeader } from './SetupOffsetsHeader'
import { LPCFlows } from '/app/organisms/LabwarePositionCheck'
import {
  OFFSET_SOURCE_CONFLICT,
  selectOffsetSource,
} from '/app/redux/protocol-runs'
import { handleOffsetsConflictModalODD } from './OffsetsConflictModalODD'

import type { Dispatch, SetStateAction } from 'react'
import type { Run } from '@opentrons/api-client'
import type { SetupScreens } from '../types'
import type { UseLPCFlowsResult } from '/app/organisms/LabwarePositionCheck'

export interface ProtocolSetupOffsetsProps {
  lpcLaunchProps: UseLPCFlowsResult
  runId: string
  runRecord: Run | undefined
  setSetupScreen: Dispatch<SetStateAction<SetupScreens>>
  lpcDisabledReason: string | null
  isConfirmed: boolean
}

export function ProtocolSetupOffsets(
  props: ProtocolSetupOffsetsProps
): JSX.Element {
  const { lpcDisabledReason, lpcLaunchProps, runId } = props
  const { showLPC, lpcProps, launchLPC } = lpcLaunchProps
  const { t } = useTranslation('protocol_setup')
  const { makeSnackbar } = useToaster()
  const offsetSource = useSelector(selectOffsetSource(runId))

  if (offsetSource === OFFSET_SOURCE_CONFLICT) {
    void handleOffsetsConflictModalODD({ ...props })
  }

  const onLPCLaunchClick = (): void => {
    if (lpcDisabledReason != null) {
      makeSnackbar(lpcDisabledReason)
    } else {
      void launchLPC()
    }
  }

  return (
    <>
      {showLPC ? (
        <LPCFlows {...lpcProps} />
      ) : (
        <Flex flexDirection={DIRECTION_COLUMN}>
          <SetupOffsetsHeader {...props} />
          <SetupOffsetsTable {...props} />
          <FloatingActionButton
            buttonText={t('labware_position_check')}
            iconName="reticle"
            onClick={onLPCLaunchClick}
          />
        </Flex>
      )}
    </>
  )
}
