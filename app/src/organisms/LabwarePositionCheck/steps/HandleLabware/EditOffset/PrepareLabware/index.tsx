import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  selectActivePipette,
  selectSelectedLwOverview,
  selectSelectedLwWithOffsetDetailsMostRecentVectorOffset,
  setInitialPosition,
} from '/app/redux/protocol-runs'
import { LPCDeck } from './LPCDeck'

import type { LoadedPipette } from '@opentrons/shared-data'
import type {
  OffsetLocationDetails,
  SelectedLwOverview,
} from '/app/redux/protocol-runs'
import type { EditOffsetContentProps } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset'
import { PlaceItemInstruction } from './PlaceItemInstruction'
import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import { TwoColumn } from '/app/molecules/InterventionModal'

export function PrepareLabware(props: EditOffsetContentProps): JSX.Element {
  const {
    runId,
    commandUtils,
    proceedSubstep,
    goBackSubstep,
    contentHeader,
  } = props
  const { toggleRobotMoving, handleConfirmLwModulePlacement } = commandUtils
  const { t } = useTranslation(['labware_position_check', 'shared'])
  const dispatch = useDispatch()

  const pipette = useSelector(selectActivePipette(runId)) as LoadedPipette
  const pipetteId = pipette.id
  const selectedLwInfo = useSelector(
    selectSelectedLwOverview(runId)
  ) as SelectedLwOverview
  const mostRecentVectorOffset = useSelector(
    selectSelectedLwWithOffsetDetailsMostRecentVectorOffset(runId)
  )
  const offsetLocationDetails = selectedLwInfo.offsetLocationDetails as OffsetLocationDetails

  const handleConfirmPlacement = (): void => {
    void toggleRobotMoving(true)
      .then(() =>
        handleConfirmLwModulePlacement(
          offsetLocationDetails,
          pipetteId,
          mostRecentVectorOffset
        )
      )
      .then(position => {
        dispatch(
          setInitialPosition(runId, {
            labwareUri: selectedLwInfo.uri,
            location: offsetLocationDetails,
            position,
          })
        )
      })
      .then(() => {
        proceedSubstep()
      })
      .finally(() => toggleRobotMoving(false))
  }

  return (
    <LPCContentContainer
      {...props}
      header={contentHeader}
      buttonText={t('confirm_placement')}
      onClickButton={handleConfirmPlacement}
      onClickBack={goBackSubstep}
    >
      <TwoColumn>
        <PlaceItemInstruction {...props} />
        <LPCDeck {...props} />
      </TwoColumn>
    </LPCContentContainer>
  )
}
