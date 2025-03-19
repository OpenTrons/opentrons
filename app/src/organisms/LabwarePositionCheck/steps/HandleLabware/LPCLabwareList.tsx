import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { useLayoutEffect, useMemo, useState } from 'react'

import {
  Flex,
  StyledText,
  SPACING,
  COLORS,
  ListButton,
  TextListTableContent,
  JUSTIFY_SPACE_BETWEEN,
  ALIGN_CENTER,
  Icon,
  RESPONSIVENESS,
  DISPLAY_NONE,
  DIRECTION_ROW,
  DISPLAY_FLEX,
  RadioButton,
} from '@opentrons/components'

import {
  selectAllLabwareInfo,
  setSelectedLabwareUri,
  selectCountNonHardcodedLocationSpecificOffsetsForLw,
  proceedEditOffsetSubstep,
  selectIsDefaultOffsetMissing,
} from '/app/redux/protocol-runs'
import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import { getIsOnDevice } from '/app/redux/config'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { LwGeometryDetails } from '/app/redux/protocol-runs'
import type { LPCContentContainerProps } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'

export function LPCLabwareList(props: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const isOnDevice = useSelector(getIsOnDevice)
  const dispatch = useDispatch()
  const [selectedUri, setSelectedUri] = useState('')

  const handlePrimaryOnClick = (): void => {
    dispatch(setSelectedLabwareUri(props.runId, selectedUri))
    dispatch(proceedEditOffsetSubstep(props.runId))
  }

  const primaryButtonProps = (): Pick<
    LPCContentContainerProps,
    'onClickButton' | 'buttonText'
  > => {
    if (isOnDevice) {
      return {
        buttonText: t('exit'),
        onClickButton: props.commandUtils.headerCommands.handleNavToDetachProbe,
      }
    } else {
      return { buttonText: t('continue'), onClickButton: handlePrimaryOnClick }
    }
  }

  return (
    <LPCContentContainer
      {...props}
      header={t('labware_position_check_title')}
      buttonText={t('exit')}
      {...primaryButtonProps()}
    >
      <LPCLabwareListContent
        {...props}
        selectedUri={selectedUri}
        setSelectedUri={setSelectedUri}
        handlePrimaryOnClickOdd={handlePrimaryOnClick}
      />
    </LPCContentContainer>
  )
}

interface LPCLabwareListContentProps extends LPCWizardContentProps {
  selectedUri: string
  setSelectedUri: (uri: string) => void
  handlePrimaryOnClickOdd: () => void
}

function LPCLabwareListContent(props: LPCLabwareListContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const { runId } = props
  const labwareInfo = useSelector(selectAllLabwareInfo(runId))

  const getIsDefaultOffsetAbsent = (info: LwGeometryDetails): boolean => {
    return (
      info?.defaultOffsetDetails?.existingOffset == null &&
      info?.defaultOffsetDetails?.workingOffset?.confirmedVector == null
    )
  }
  // Create and sort the labware entries
  const sortedLabwareEntries = useMemo(() => {
    return Object.entries(labwareInfo)
      .map(([uri, info]) => ({
        uri,
        info,
        isMissingDefaultOffset: getIsDefaultOffsetAbsent(info),
      }))
      .sort((a, b) => {
        // Primary sort: isMissingDefaultOffset (true values first).
        if (a.isMissingDefaultOffset !== b.isMissingDefaultOffset) {
          return a.isMissingDefaultOffset ? -1 : 1
        }

        // Secondary sort: alphabetical by displayName.
        return a.info.displayName.localeCompare(b.info.displayName)
      })
  }, [labwareInfo])

  // On the initial render, select the first uri from the list of labware (for desktop app purposes).
  useLayoutEffect(() => {
    props.setSelectedUri(sortedLabwareEntries[0].uri)
  }, [])

  return (
    <TextListTableContent header={t('select_labware_to_view_data')}>
      {/* Design uses custom headers here that are not a part of the table component */}
      {/* header styling, so we inject a custom header. */}
      <Flex css={DESKTOP_ONLY}>
        <thead css={DESKTOP_PSEUDO_HEADER_CONTAINER_STYLE}>
          <tr>
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('labware_type')}
            </StyledText>
          </tr>
          <tr>
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('total_offsets')}
            </StyledText>
          </tr>
        </thead>
      </Flex>
      {sortedLabwareEntries.map(({ uri, info }) => (
        <LabwareItem key={`labware_${uri}`} uri={uri} info={info} {...props} />
      ))}
      {/* Accommodate scrolling on the ODD. */}
      <Flex css={ODD_SCROLL_BUFFER} />
    </TextListTableContent>
  )
}

interface LabwareItemProps extends LPCLabwareListContentProps {
  uri: string
  info: LwGeometryDetails
}

function LabwareItem({
  uri,
  info,
  runId,
  handlePrimaryOnClickOdd,
  setSelectedUri,
  selectedUri,
}: LabwareItemProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const isMissingDefaultOffset = useSelector(
    selectIsDefaultOffsetMissing(runId, uri)
  )
  const countLocationSpecificOffsets = useSelector(
    selectCountNonHardcodedLocationSpecificOffsetsForLw(runId, uri)
  )
  const isOnDevice = useSelector(getIsOnDevice)

  const getOffsetCopy = (): string => {
    if (countLocationSpecificOffsets > 1) {
      return isMissingDefaultOffset
        ? t('num_missing_offsets', { num: countLocationSpecificOffsets })
        : t('num_offsets', { num: countLocationSpecificOffsets })
    } else {
      return isMissingDefaultOffset ? t('one_missing_offset') : t('one_offset')
    }
  }

  return isOnDevice ? (
    <ListButton
      type={isMissingDefaultOffset ? 'notConnected' : 'noActive'}
      onClick={handlePrimaryOnClickOdd}
      width="100%"
    >
      <Flex css={CONTENT_CONTAINER_STYLE}>
        <Flex css={TEXT_CONTAINER_STYLE}>
          <StyledText oddStyle="level4HeaderSemiBold">
            {info.displayName}
          </StyledText>
          <StyledText oddStyle="bodyTextRegular" css={SUBTEXT_STYLE}>
            {getOffsetCopy()}
          </StyledText>
        </Flex>
        <Icon name="chevron-right" css={ICON_STYLE} />
      </Flex>
    </ListButton>
  ) : (
    <RadioButton
      buttonLabel={info.displayName}
      buttonValue={info.displayName}
      largeDesktopBorderRadius={true}
      buttonSubLabel={{ label: getOffsetCopy() }}
      isSelected={selectedUri === uri}
      onChange={() => {
        setSelectedUri(uri)
      }}
    />
  )
}

const CONTENT_CONTAINER_STYLE = css`
  width: 100%;
  grid-gap: ${SPACING.spacing24};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
`

const TEXT_CONTAINER_STYLE = css`
  width: 100%;
  flex-grow: 1;
  gap: ${SPACING.spacing16};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
`

const SUBTEXT_STYLE = css`
  color: ${COLORS.grey60};
`

const ICON_STYLE = css`
  width: ${SPACING.spacing48};
  height: ${SPACING.spacing48};
`

const DESKTOP_ONLY = css`
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    display: ${DISPLAY_NONE};
  }
`

const DESKTOP_PSEUDO_HEADER_CONTAINER_STYLE = css`
  color: ${COLORS.grey60};
  width: 100%;
  flex-direction: ${DIRECTION_ROW};
  display: ${DISPLAY_FLEX};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  padding: 0 ${SPACING.spacing12};
`

const ODD_SCROLL_BUFFER = css`
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: ${SPACING.spacing40};
  }
`
