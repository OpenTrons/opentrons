import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { css } from 'styled-components'

import { Flex, COLORS, BORDERS, RESPONSIVENESS } from '@opentrons/components'

import {
  OFFSET_KIND_DEFAULT,
  OFFSET_KIND_LOCATION_SPECIFIC,
  proceedEditOffsetSubstep,
  resetLocationSpecificOffsetToDefault,
  selectIsDefaultOffsetAbsent,
  selectMostRecentVectorOffsetForLwWithOffsetDetails,
  setSelectedLabware,
} from '/app/redux/protocol-runs'
import { OffsetTag } from '/app/organisms/LabwarePositionCheck/OffsetTag'
import { MultiDeckLabelTagBtns } from '/app/molecules/MultiDeckLabelTagBtns'
import { LabwareOffsetsDeckInfoLabels } from '/app/organisms/LabwareOffsetsDeckInfoLabels'
import { useLPCSnackbars } from '/app/organisms/LabwarePositionCheck/hooks'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { LocationSpecificOffsetDetails } from '/app/redux/protocol-runs'
import type { OffsetTagProps } from '/app/organisms/LabwarePositionCheck/OffsetTag'

interface LabwareLocationItemProps extends LPCWizardContentProps {
  locationSpecificOffsetDetails: LocationSpecificOffsetDetails
  slotCopy: string
}

export function LabwareLocationItem({
  runId,
  locationSpecificOffsetDetails,
  commandUtils,
  slotCopy,
}: LabwareLocationItemProps): JSX.Element {
  const { t: lpcTextT } = useTranslation('labware_position_check')
  const { toggleRobotMoving, handleCheckItemsPrepModules } = commandUtils
  const { locationDetails } = locationSpecificOffsetDetails
  const { definitionUri } = locationDetails
  const isHardcodedOffset = locationDetails.hardCodedOffsetId != null
  const dispatch = useDispatch()
  const { makeHardCodedSnackbar } = useLPCSnackbars(runId)

  const mostRecentOffset = useSelector(
    selectMostRecentVectorOffsetForLwWithOffsetDetails(
      runId,
      definitionUri,
      locationSpecificOffsetDetails
    )
  )
  const isDefaultOffsetAbsent = useSelector(
    selectIsDefaultOffsetAbsent(runId, definitionUri)
  )

  const handleLaunchEditOffset = (): void => {
    void toggleRobotMoving(true)
      .then(() => {
        dispatch(setSelectedLabware(runId, definitionUri, locationDetails))
      })
      .then(() => handleCheckItemsPrepModules(locationDetails))
      .then(() => {
        dispatch(proceedEditOffsetSubstep(runId))
      })
      .finally(() => toggleRobotMoving(false))
  }

  const handleResetOffset = (): void => {
    dispatch(
      resetLocationSpecificOffsetToDefault(
        runId,
        definitionUri,
        locationDetails
      )
    )
  }

  const buildOffsetTagProps = (): OffsetTagProps => {
    if (isHardcodedOffset) {
      return { kind: 'hardcoded' }
    } else if (mostRecentOffset == null) {
      return { kind: 'noOffset' }
    } else if (mostRecentOffset?.kind === OFFSET_KIND_DEFAULT) {
      return { kind: 'default' }
    } else {
      return { kind: 'vector', ...mostRecentOffset.offset }
    }
  }

  return (
    <Flex css={DECK_LABEL_CONTAINER_STYLE}>
      <MultiDeckLabelTagBtns
        colOneDeckInfoLabels={[
          <LabwareOffsetsDeckInfoLabels
            key="1"
            detail={locationSpecificOffsetDetails}
            slotCopy={slotCopy}
          />,
        ]}
        colTwoTag={<OffsetTag {...buildOffsetTagProps()} />}
        colThreePrimaryBtn={{
          buttonText: lpcTextT('adjust'),
          onClick: isHardcodedOffset
            ? makeHardCodedSnackbar
            : handleLaunchEditOffset,
          buttonType: 'secondary',
          disabled: isDefaultOffsetAbsent,
          ariaDisabled: isHardcodedOffset,
        }}
        colThreeSecondaryBtn={{
          buttonText: lpcTextT('reset_to_default'),
          onClick: isHardcodedOffset
            ? makeHardCodedSnackbar
            : handleResetOffset,
          buttonType: 'tertiaryHighLight',
          disabled: mostRecentOffset?.kind !== OFFSET_KIND_LOCATION_SPECIFIC,
          ariaDisabled: isHardcodedOffset,
        }}
      />
    </Flex>
  )
}

const DECK_LABEL_CONTAINER_STYLE = css`
  background-color: ${COLORS.grey20};
  border-radius: ${BORDERS.borderRadius4};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    background-color: ${COLORS.grey35};
    border-radius: ${BORDERS.borderRadius8};
  }
`
