import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { css } from 'styled-components'

import {
  Flex,
  DeckInfoLabel,
  MODULE_ICON_NAME_BY_TYPE,
  COLORS,
  BORDERS,
  RESPONSIVENESS,
} from '@opentrons/components'
import { getModuleType } from '@opentrons/shared-data'

import {
  OFFSET_KIND_DEFAULT,
  OFFSET_KIND_LOCATION_SPECIFIC,
  proceedEditOffsetSubstep,
  resetLocationSpecificOffsetToDefault,
  selectIsDefaultOffsetAbsent,
  selectMostRecentVectorOffsetForLwWithOffsetDetails,
  setSelectedLabware,
} from '/app/redux/protocol-runs'
import { OffsetTag } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/OffsetTag'
import { MultiDeckLabelTagBtns } from '/app/molecules/MultiDeckLabelTagBtns'

import type { ModuleType } from '@opentrons/shared-data'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { LocationSpecificOffsetDetails } from '/app/redux/protocol-runs'
import type { OffsetTagProps } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/OffsetTag'

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
  const dispatch = useDispatch()

  const mostRecentOffset = useSelector(
    selectMostRecentVectorOffsetForLwWithOffsetDetails(
      runId,
      definitionUri,
      locationSpecificOffsetDetails
    )
  )
  const isMissingDefaultOffset = useSelector(
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
    if (mostRecentOffset == null) {
      return { kind: 'noOffset' }
    } else if (mostRecentOffset?.kind === OFFSET_KIND_DEFAULT) {
      return { kind: 'default' }
    } else {
      return { kind: 'vector', ...mostRecentOffset.offset }
    }
  }

  // TODO(jh, 03-06-25): Add the stacked label after integrating the new API work.
  //  Note that it is the same as the Flex stacker module type.
  const buildDeckInfoLabels = (): JSX.Element[] => {
    const moduleIconType = (): ModuleType | null => {
      const moduleModel = locationDetails.moduleModel

      if (moduleModel != null) {
        return getModuleType(moduleModel)
      } else {
        return null
      }
    }

    const deckInfoLabels = [
      <DeckInfoLabel deckLabel={slotCopy} key={slotCopy} />,
    ]

    const moduleType = moduleIconType()
    if (moduleType !== null) {
      deckInfoLabels.push(
        <DeckInfoLabel
          iconName={MODULE_ICON_NAME_BY_TYPE[moduleType]}
          key="module-icon"
        />
      )
    }

    return deckInfoLabels
  }

  return (
    <Flex css={DECK_LABEL_CONTAINER_STYLE}>
      <MultiDeckLabelTagBtns
        colOneDeckInfoLabels={buildDeckInfoLabels()}
        colTwoTag={<OffsetTag {...buildOffsetTagProps()} />}
        colThreePrimaryBtn={{
          buttonText: lpcTextT('adjust'),
          onClick: handleLaunchEditOffset,
          buttonType: 'secondary',
          disabled: isMissingDefaultOffset,
        }}
        colThreeSecondaryBtn={{
          buttonText: lpcTextT('reset_to_default'),
          onClick: handleResetOffset,
          buttonType: 'tertiaryHighLight',
          disabled: mostRecentOffset?.kind !== OFFSET_KIND_LOCATION_SPECIFIC,
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
