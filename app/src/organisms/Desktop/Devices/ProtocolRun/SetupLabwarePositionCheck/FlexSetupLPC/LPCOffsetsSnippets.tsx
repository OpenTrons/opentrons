import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'
import { createPortal } from 'react-dom'

import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  COLORS,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_END,
  ModalHeader,
  ModalShell,
  PrimaryButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { getModalPortalEl } from '/app/App/portal'
import { LearnAboutOffsetsLink } from '/app/organisms/Desktop/Devices/ProtocolRun/LearnAboutOffsetsLink'
import { LabwareOffsetSnippet } from '/app/molecules/LabwareOffsetSnippet'

import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'
import type { LabwareOffsetCreateData } from '@opentrons/api-client'
import type { SetupLabwarePositionCheckProps } from '/app/organisms/Desktop/Devices/ProtocolRun/SetupLabwarePositionCheck'

interface LPCOffsetsSnippetsProps extends SetupLabwarePositionCheckProps {
  protocolData: CompletedProtocolAnalysis
  lwOffsetsForRun: LabwareOffsetCreateData[]
}

export function LPCOffsetsSnippets(
  props: LPCOffsetsSnippetsProps
): JSX.Element {
  const { t } = useTranslation('protocol_setup')

  const [showModal, setShowModal] = useState(false)

  return (
    <Flex css={CONTAINER_STYLE}>
      <StyledText
        css={TEXT_STYLE}
        desktopStyle="bodyDefaultRegular"
        onClick={() => {
          setShowModal(!showModal)
        }}
      >
        {t('view_snippets')}
      </StyledText>
      {showModal && (
        <LPCOffsetsSnippetsModal
          {...props}
          toggleModal={() => {
            setShowModal(!showModal)
          }}
        />
      )}
    </Flex>
  )
}

type SnippetButtonType = 'jupyter' | 'cli'

interface LPCOffsetsSnippetsModalProps extends LPCOffsetsSnippetsProps {
  toggleModal: () => void
}

function LPCOffsetsSnippetsModal({
  toggleModal,
  protocolData,
  lwOffsetsForRun,
}: LPCOffsetsSnippetsModalProps): JSX.Element {
  const { t } = useTranslation('protocol_setup')
  const [activeSnippet, setActiveSnippet] = useState<SnippetButtonType>(
    'jupyter'
  )

  const buildHeader = (): JSX.Element => {
    return (
      <ModalHeader
        title={t('labware_offset_data_code_snippets')}
        color={COLORS.black90}
        backgroundColor={COLORS.white}
        onClose={toggleModal}
      />
    )
  }

  const snippetTextRef = useRef<string>('')
  const handleSnippetUpdate = (snippetText: string): void => {
    snippetTextRef.current = snippetText
  }
  const handleCopyClick = (): void => {
    if (snippetTextRef.current !== '') {
      void navigator.clipboard.writeText(snippetTextRef.current)
    }
  }

  return createPortal(
    <ModalShell header={buildHeader()} css={DESKTOP_MODAL_STYLE}>
      <Flex css={DESKTOP_MODAL_CONTENT_CONTAINER_STYLE}>
        <Flex css={TEXT_CONTAINER_STYLE}>
          <StyledText desktopStyle="captionRegular">
            {t('you_can_still_adjust_offsets')}
          </StyledText>
          <LearnAboutOffsetsLink />
        </Flex>
        <Flex css={SNIPPETS_CONTAINER_STYLE}>
          <Flex css={BTNS_CONTAINER_STYLE}>
            <RoundNavLink
              css={
                activeSnippet === 'jupyter'
                  ? ACTIVE_SNIPPET_BTN_STYLE
                  : undefined
              }
              onClick={() => {
                setActiveSnippet('jupyter')
              }}
            >
              <StyledText desktopStyle="bodyDefaultSemiBold">
                {t('jupyter_notebook')}
              </StyledText>
            </RoundNavLink>
            <RoundNavLink
              css={
                activeSnippet === 'cli' ? ACTIVE_SNIPPET_BTN_STYLE : undefined
              }
              onClick={() => {
                setActiveSnippet('cli')
              }}
            >
              <StyledText desktopStyle="bodyDefaultSemiBold">
                {t('cli_ssh')}
              </StyledText>
            </RoundNavLink>
          </Flex>
          <LabwareOffsetSnippet
            mode={activeSnippet}
            commands={protocolData.commands}
            labware={protocolData.labware}
            modules={protocolData.modules}
            labwareOffsets={lwOffsetsForRun}
            robotType={FLEX_ROBOT_TYPE}
            onSnippetUpdate={handleSnippetUpdate}
          />
          <Flex css={CLIPBOARD_BTN_CONTAINER_STYLE}>
            <PrimaryButton onClick={handleCopyClick}>
              <Flex css={CLIPBOARD_BTN_CONTENTS_STYLE}>
                <Icon name="copy-text" css={CLIPBOARD_ICON_STYLE} />
                {t('copy_to_clipboard')}
              </Flex>
            </PrimaryButton>
          </Flex>
        </Flex>
      </Flex>
    </ModalShell>,
    getModalPortalEl()
  )
}

const CONTAINER_STYLE = css`
  justify-content: ${JUSTIFY_CENTER};
`

const TEXT_STYLE = css`
  padding: ${SPACING.spacing4};
  text-decoration: underline solid;
  text-underline-offset: 3px;
  cursor: ${CURSOR_POINTER};
`

const DESKTOP_MODAL_STYLE = css`
  width: 33.375rem;
  gap: ${SPACING.spacing16};
`

const DESKTOP_MODAL_CONTENT_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  padding: ${SPACING.spacing24};
  gap: ${SPACING.spacing24};
`

const TEXT_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  gap: ${SPACING.spacing8};
`

const SNIPPETS_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  gap: ${SPACING.spacing12};
`

const BTNS_CONTAINER_STYLE = css`
  gap: ${SPACING.spacing4};
`

const ACTIVE_SNIPPET_BTN_STYLE = css`
  background-color: ${COLORS.purple50};
  color: ${COLORS.white};
`

const RoundNavLink = styled(Btn)`
  ${TYPOGRAPHY.pSemiBold}
  color: ${COLORS.black90};
  background-color: ${COLORS.purple30};
  border-radius: ${BORDERS.borderRadius8};
  padding: ${SPACING.spacing8} ${SPACING.spacing12};
  gap: ${SPACING.spacing10};

  &:hover {
    background-color: ${COLORS.purple50};
    color: ${COLORS.white};
  }
`

const CLIPBOARD_BTN_CONTAINER_STYLE = css`
  justify-content: ${JUSTIFY_END};

  padding-top: 1.125rem;
  padding-left: ${SPACING.spacing12};
  gap: ${SPACING.spacing8};
`

const CLIPBOARD_BTN_CONTENTS_STYLE = css`
  align-items: ${ALIGN_CENTER};
  gap: ${SPACING.spacing4};
`

const CLIPBOARD_ICON_STYLE = css`
  width: ${SPACING.spacing20};
  height: ${SPACING.spacing20};
`
