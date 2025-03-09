import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  ListButton,
  Flex,
  StyledText,
  SPACING,
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
  ALIGN_CENTER,
} from '@opentrons/components'

import {
  proceedEditOffsetSubstep,
  selectMostRecentVectorOffsetForUriAndLocation,
  selectSelectedLwDefaultOffsetDetails,
  setSelectedLabware,
} from '/app/redux/protocol-runs'
import { OffsetTag } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/OffsetTag'
import { ManageDefaultOffsetBtn } from './ManageDefaultOffsetBtn'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { OffsetTagProps } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/OffsetTag'
import type { DefaultOffsetDetails } from '/app/redux/protocol-runs'

export function DefaultLocationOffset(
  props: LPCWizardContentProps
): JSX.Element {
  const { runId, commandUtils } = props
  const { toggleRobotMoving, handleCheckItemsPrepModules } = commandUtils
  const { t } = useTranslation('labware_position_check')
  const dispatch = useDispatch()
  const defaultOffsetDetails = useSelector(
    selectSelectedLwDefaultOffsetDetails(runId)
  ) as DefaultOffsetDetails
  const mostRecentOffset = useSelector(
    selectMostRecentVectorOffsetForUriAndLocation(
      runId,
      defaultOffsetDetails.locationDetails.definitionUri,
      defaultOffsetDetails
    )
  )

  // TOME TODO: Basically confirm everywhere that uses existingOffset and replace it with the selectSelectedLwMostRecentVectorOffset stuff.

  const handleLaunchEditOffset = (): void => {
    void toggleRobotMoving(true)
      .then(() => {
        dispatch(
          setSelectedLabware(
            runId,
            defaultOffsetDetails.locationDetails.definitionUri,
            defaultOffsetDetails.locationDetails
          )
        )
      })
      .then(() =>
        handleCheckItemsPrepModules(
          defaultOffsetDetails.locationDetails,
          defaultOffsetDetails.existingOffset?.vector ?? null
        )
      )
      .then(() => {
        dispatch(proceedEditOffsetSubstep(runId))
      })
      .finally(() => toggleRobotMoving(false))
  }

  const buildOffsetTagProps = (): OffsetTagProps => {
    if (mostRecentOffset == null) {
      return { kind: 'noOffset' }
    } else {
      return { kind: 'vector', ...mostRecentOffset.offset }
    }
  }

  return (
    <ListButton type="noActive">
      <Flex css={BUTTON_ALL_CONTENT_STYLE}>
        <Flex css={BUTTON_LEFT_CONTENT_STYLE}>
          <StyledText oddStyle="level4HeaderSemiBold">
            {t('default_labware_offset')}
          </StyledText>
          <Flex>
            <OffsetTag {...buildOffsetTagProps()} />
          </Flex>
        </Flex>
        <ManageDefaultOffsetBtn
          isMissingDefaultOffset={mostRecentOffset == null}
          onClick={handleLaunchEditOffset}
        />
      </Flex>
    </ListButton>
  )
}

const BUTTON_ALL_CONTENT_STYLE = css`
  grid-gap: ${SPACING.spacing24};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
  width: 100%;
`

const BUTTON_LEFT_CONTENT_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing8};
`
