import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'

import {
  DeckInfoLabel,
  Tag,
  StyledText,
  RadioButton,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  getWellFillFromLabwareId,
  LabwareRender,
  truncateString,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  COLORS,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_START,
  ALIGN_CENTER,
} from '@opentrons/components'
import { getAllDefinitions } from '@opentrons/shared-data'

import { ODDBackButton } from '/app/molecules/ODDBackButton'
import { LabwareLiquidsDetailModal } from './LabwareLiquidsDetailModal'
import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'
import type { LabwareByLiquidId } from '@opentrons/components'
import type { StackItem, LabwareInStack } from '/app/transformations/commands'

const LabwareThumbnail = styled.svg`
  transform: scale(1, -1);
  width: 34rem;
  flex-shrink: 0;
`
const HIDE_SCROLLBAR = css`
  ::-webkit-scrollbar {
    display: none;
  }
`
const RADIO_BUTTON = css`
  word-break: keep-all;
`

const MAX_CHARS_FOR_DISPLAY_NAME = 44

export interface SetupLabwareStackViewProps {
  onClickBack: () => void
  slotName: string
  stackedItems: StackItem[]
  labwareByLiquidId: LabwareByLiquidId
  mostRecentAnalysis: CompletedProtocolAnalysis
}

export function SetupLabwareStackView({
  onClickBack,
  slotName,
  stackedItems,
  labwareByLiquidId,
  mostRecentAnalysis,
}: SetupLabwareStackViewProps): JSX.Element {
  const labwareDefinitions = getAllDefinitions()
  const { t, i18n } = useTranslation([
    'protocol_setup',
    'protocol_command_text',
  ])
  const labwareInStack = stackedItems.filter(
    (lw): lw is LabwareInStack => 'labwareId' in lw
  )
  const firstDefUri = labwareInStack[0].definitionUri
  const isVariedStack = !labwareInStack.every(
    lw => lw.definitionUri === firstDefUri
  )

  const [showLiquidDetailsModal, setShowLiquidDetailsModal] = useState<boolean>(
    false
  )
  const [selectedLabware, setSelectedLabware] = useState(labwareInStack[0])
  const wellFill = getWellFillFromLabwareId(
    selectedLabware.labwareId,
    mostRecentAnalysis?.liquids ?? [],
    labwareByLiquidId
  )
  const hasLiquids = Object.keys(wellFill).length > 0
  const labwareDefinition = labwareDefinitions[selectedLabware.definitionUri]

  return (
    <>
      {showLiquidDetailsModal ? (
        <LabwareLiquidsDetailModal
          labwareId={selectedLabware.labwareId}
          labwareDisplayName={selectedLabware.displayName}
          labwareByLiquidId={labwareByLiquidId}
          labwareDefinition={labwareDefinition}
          mostRecentAnalysis={mostRecentAnalysis}
          closeModal={() => {
            setShowLiquidDetailsModal(false)
          }}
        />
      ) : null}
      <Flex
        flexDirection={DIRECTION_ROW}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
      >
        <Flex
          flexDirection={DIRECTION_ROW}
          justifyContent={JUSTIFY_FLEX_START}
          alignItems={ALIGN_CENTER}
        >
          <ODDBackButton onClick={onClickBack} />
          {slotName !== 'offDeck' ? (
            <StyledText
              oddStyle="level2HeaderBold"
              marginRight={SPACING.spacing16}
            >
              {t('labware_in')}
            </StyledText>
          ) : null}
          <DeckInfoLabel
            deckLabel={
              slotName === 'offDeck'
                ? i18n.format(t('protocol_command_text:off_deck'), 'upperCase')
                : slotName
            }
          />
        </Flex>
        {labwareInStack.length > 1 ? (
          <Tag
            text={t('total_stacked', { quantity: labwareInStack.length })}
            type="default"
          />
        ) : null}
      </Flex>
      <Flex
        flexDirection={DIRECTION_ROW}
        justifyContent={JUSTIFY_CENTER}
        marginTop={SPACING.spacing24}
        gridGap={SPACING.spacing40}
      >
        {isVariedStack ? (
          <Flex
            flexDirection={DIRECTION_COLUMN}
            height="27rem"
            css={HIDE_SCROLLBAR}
            overflowY="scroll"
            width="350px"
            gridGap={SPACING.spacing8}
          >
            <StyledText oddStyle="smallBodyTextRegular" color={COLORS.grey60}>
              {t('top_of_slot')}
            </StyledText>
            {labwareInStack.map((labware, index) => {
              const isSelected = selectedLabware.labwareId === labware.labwareId
              const label = (
                <Flex
                  gridGap={SPACING.spacing16}
                  alignItems={ALIGN_CENTER}
                  css={RADIO_BUTTON}
                >
                  <Tag
                    type={isSelected ? 'onColor' : 'default'}
                    text={(labwareInStack.length - index).toString()}
                  />
                  <StyledText oddStyle="bodyTextRegular" wordBreak="keep-all">
                    {truncateString(
                      labware.displayName,
                      MAX_CHARS_FOR_DISPLAY_NAME
                    )}
                  </StyledText>
                </Flex>
              )
              return (
                <RadioButton
                  key={index}
                  radioButtonType="small"
                  buttonLabel={label}
                  buttonValue={index}
                  isSelected={isSelected}
                  maxLines={2}
                  onChange={() => {
                    setSelectedLabware(labware)
                  }}
                />
              )
            })}
            <StyledText oddStyle="smallBodyTextRegular" color={COLORS.grey60}>
              {t('bottom_of_slot')}
            </StyledText>
          </Flex>
        ) : null}
        <Flex
          flexDirection={DIRECTION_COLUMN}
          alignItems={ALIGN_CENTER}
          gridGap={SPACING.spacing16}
        >
          <StyledText oddStyle="bodyTextBold" marginRight={SPACING.spacing16}>
            {truncateString(
              selectedLabware.displayName,
              MAX_CHARS_FOR_DISPLAY_NAME
            )}
          </StyledText>
          {selectedLabware.lidDisplayName ? (
            <StyledText
              oddStyle="bodyTextRegular"
              color={COLORS.grey60}
              marginRight={SPACING.spacing16}
            >
              {truncateString(
                selectedLabware.lidDisplayName,
                MAX_CHARS_FOR_DISPLAY_NAME
              )}
            </StyledText>
          ) : null}
          <LabwareThumbnail
            viewBox={`${labwareDefinition.cornerOffsetFromSlot.x} ${labwareDefinition.cornerOffsetFromSlot.y} ${labwareDefinition.dimensions.xDimension} ${labwareDefinition.dimensions.yDimension}`}
          >
            <g
              onClick={() => {
                if (hasLiquids) {
                  setShowLiquidDetailsModal(true)
                }
              }}
              cursor={hasLiquids ? 'pointer' : ''}
            >
              <LabwareRender
                definition={labwareDefinition}
                wellFill={wellFill}
              />
            </g>
          </LabwareThumbnail>
          {hasLiquids ? (
            <StyledText oddStyle="smallBodyTextRegular" color={COLORS.grey60}>
              {t('tap_labware_to_view')}
            </StyledText>
          ) : null}
        </Flex>
      </Flex>
    </>
  )
}
