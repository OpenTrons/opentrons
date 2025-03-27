import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { useLayoutEffect, useState } from 'react'

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
  setSelectedLabwareUri,
  proceedEditOffsetSubstep,
  selectIsNecessaryDefaultOffsetMissing,
  selectAllLabwareInfoAndDefaultStatusSorted,
  selectTotalOrMissingOffsetRequiredCountForLwCopy,
} from '/app/redux/protocol-runs'
import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import { getIsOnDevice } from '/app/redux/config'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { LwGeometryDetails } from '/app/redux/protocol-runs'
import type { LPCContentContainerProps } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import type { TFunction } from 'i18next'

export function LPCLabwareList(props: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const isOnDevice = useSelector(getIsOnDevice)
  const dispatch = useDispatch()
  const [selectedUri, setSelectedUri] = useState('')

  const handlePrimaryOnClick = (uri: string): void => {
    dispatch(setSelectedLabwareUri(props.runId, uri))
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
      return {
        buttonText: t('continue'),
        onClickButton: () => {
          handlePrimaryOnClick(selectedUri)
        },
      }
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
  handlePrimaryOnClickOdd: (uri: string) => void
}

function LPCLabwareListContent(props: LPCLabwareListContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const { runId } = props
  const labwareInfo = useSelector(
    selectAllLabwareInfoAndDefaultStatusSorted(runId)
  )
  const isOnDevice = useSelector(getIsOnDevice)

  // On the initial render, select the first uri from the list of labware (for desktop app purposes).
  useLayoutEffect(() => {
    if (!isOnDevice) {
      props.setSelectedUri(labwareInfo[0].uri)
    }
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
      {labwareInfo.map(({ uri, info }) => (
        <LabwareItem
          key={`labware_${uri}${Math.random()}`}
          uri={uri}
          info={info}
          {...props}
        />
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
  const isNecessaryDefaultOffsetMissing = useSelector(
    selectIsNecessaryDefaultOffsetMissing(runId, uri)
  )
  const offsetCopy = useSelector(
    selectTotalOrMissingOffsetRequiredCountForLwCopy(runId, uri, t as TFunction)
  )
  const isOnDevice = useSelector(getIsOnDevice)

  return isOnDevice ? (
    <ListButton
      type={isNecessaryDefaultOffsetMissing ? 'notConnected' : 'noActive'}
      onClick={() => {
        handlePrimaryOnClickOdd(uri)
      }}
      width="100%"
    >
      <Flex css={CONTENT_CONTAINER_STYLE}>
        <Flex css={TEXT_CONTAINER_STYLE}>
          <StyledText oddStyle="level4HeaderSemiBold">
            {info.displayName}
          </StyledText>
          <StyledText oddStyle="bodyTextRegular" css={SUBTEXT_STYLE}>
            {offsetCopy}
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
      buttonSubLabel={{ label: offsetCopy }}
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
