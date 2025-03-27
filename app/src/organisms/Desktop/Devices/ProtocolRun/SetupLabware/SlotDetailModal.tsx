import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import {
  Box,
  getWellFillFromLabwareId,
  COLORS,
  DIRECTION_COLUMN,
  ALIGN_CENTER,
  DIRECTION_ROW,
  Flex,
  LabwareRender,
  SPACING,
  DeckInfoLabel,
  Tag,
  StyledText,
  TYPOGRAPHY,
  Modal,
  JUSTIFY_CENTER,
} from '@opentrons/components'
import {
  getAllDefinitions,
  parseLiquidsInLoadOrder,
} from '@opentrons/shared-data'

import { LiquidCardList } from '/app/molecules/LiquidDetailCard'
import { LabwareStackContents } from '/app/molecules/LabwareStackContents'
import {
  getLiquidsByIdForLabware,
  getWellGroupForLiquidId,
  getDisabledWellGroupForLiquidId,
} from '/app/transformations/analysis'

import type {
  CompletedProtocolAnalysis,
  ProtocolAnalysisOutput,
} from '@opentrons/shared-data'
import type { LabwareByLiquidId } from '@opentrons/components/'
import type { StackItem, LabwareInStack } from '/app/transformations/commands'

interface SlotDetailModalProps {
  closeModal: () => void
  slotName: string
  stackedItems: StackItem[]
  labwareByLiquidId: LabwareByLiquidId
  mostRecentAnalysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput
}

const LabwareThumbnail = styled.svg`
  transform: scale(1, -1);
  flex-shrink: 0;
`

export const SlotDetailModal = (
  props: SlotDetailModalProps
): JSX.Element | null => {
  const {
    closeModal,
    slotName,
    stackedItems,
    labwareByLiquidId,
    mostRecentAnalysis: protocolData,
  } = props
  const { t, i18n } = useTranslation('protocol_setup')
  const labwareDefinitions = getAllDefinitions()

  const labwareInStack = stackedItems.filter(
    (lw): lw is LabwareInStack => 'labwareId' in lw
  )
  const firstDefUri = labwareInStack[0].definitionUri
  const isVariedStack = !labwareInStack.every(
    lw => lw.definitionUri === firstDefUri
  )
  const [selectedLabware, setSelectedLabware] = useState(labwareInStack[0])
  const wellFill = getWellFillFromLabwareId(
    selectedLabware.labwareId,
    protocolData?.liquids ?? [],
    labwareByLiquidId
  )

  const labwareDefinition = labwareDefinitions[selectedLabware.definitionUri]

  const commands = protocolData?.commands ?? []
  const liquids = parseLiquidsInLoadOrder(
    protocolData?.liquids != null ? protocolData?.liquids : [],
    commands
  )
  const liquidsByIdForLabware = getLiquidsByIdForLabware(
    selectedLabware.labwareId,
    labwareByLiquidId
  )
  const filteredLiquidsInLoadOrder = liquids.filter(liquid => {
    return Object.keys(liquidsByIdForLabware).some(key => key === liquid.id)
  })
  const [selectedLiquidId, setSelectedLiquidId] = useState<string | undefined>(
    filteredLiquidsInLoadOrder.length > 0
      ? filteredLiquidsInLoadOrder[0].id
      : undefined
  )

  useEffect(() => {
    setSelectedLiquidId(
      filteredLiquidsInLoadOrder.length > 0
        ? filteredLiquidsInLoadOrder[0].id
        : undefined
    )
  }, [selectedLabware])

  if (protocolData == null) return null
  const liquidIds = filteredLiquidsInLoadOrder.map(liquid => liquid.id)
  const disabledLiquidIds = liquidIds.filter(id => id !== selectedLiquidId)

  const labwareRender = (
    <LabwareRender
      definition={labwareDefinition}
      wellFill={wellFill}
      wellLabelOption="SHOW_LABEL_INSIDE"
      highlightedWells={
        selectedLiquidId != null &&
        Object.entries(liquidsByIdForLabware).length > 0
          ? getWellGroupForLiquidId(liquidsByIdForLabware, selectedLiquidId)
          : {}
      }
      disabledWells={
        selectedLiquidId != null &&
        Object.entries(liquidsByIdForLabware).length > 0
          ? getDisabledWellGroupForLiquidId(
              liquidsByIdForLabware,
              disabledLiquidIds
            )
          : []
      }
    />
  )
  const modalTitle = (
    <Flex alignItems={ALIGN_CENTER}>
      {slotName !== 'offDeck' ? (
        <StyledText oddStyle="level2HeaderBold" marginRight={SPACING.spacing16}>
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
  )
  const stackedTag = (
    <>
      {labwareInStack.length > 1 ? (
        <Tag
          text={t('total_stacked', { quantity: labwareInStack.length })}
          type="default"
        />
      ) : null}
    </>
  )

  return (
    <Modal
      title={modalTitle}
      headerTagElement={stackedTag}
      hasHeader
      onClose={closeModal}
      closeOnOutsideClick
      childrenPadding={0}
      width={isVariedStack || selectedLiquidId != null ? '47rem' : '31.25rem'}
      marginLeft="0"
      overflowY="hidden"
    >
      <Box
        backgroundColor={COLORS.grey10}
        padding={SPACING.spacing16}
        height={selectedLiquidId != null || isVariedStack ? '28rem' : '25rem'}
      >
        <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing24}>
          {isVariedStack ? (
            <LabwareStackContents
              labwareInStack={labwareInStack}
              selectedLabware={selectedLabware}
              setSelectedLabware={setSelectedLabware}
              height="26rem"
            />
          ) : null}
          <Flex
            flexDirection={DIRECTION_COLUMN}
            height="26rem"
            gridGap={SPACING.spacing16}
            alignItems={ALIGN_CENTER}
            justifyContent={JUSTIFY_CENTER}
          >
            <Flex flexDirection={DIRECTION_COLUMN} alignItems={ALIGN_CENTER}>
              <StyledText
                desktopStyle="bodyDefaultSemiBold"
                fontWeight={TYPOGRAPHY.fontWeightRegular}
              >
                {selectedLabware.displayName}
              </StyledText>
              {selectedLabware.lidDisplayName != null ? (
                <StyledText
                  desktopStyle="bodyDefaultRegular"
                  fontWeight={TYPOGRAPHY.fontWeightRegular}
                  color={COLORS.grey60}
                >
                  {selectedLabware.lidDisplayName}
                </StyledText>
              ) : null}
            </Flex>
            <LabwareThumbnail
              viewBox={`${labwareDefinition.cornerOffsetFromSlot.x} ${labwareDefinition.cornerOffsetFromSlot.y} ${labwareDefinition.dimensions.xDimension} ${labwareDefinition.dimensions.yDimension}`}
              width={
                selectedLiquidId != null && isVariedStack ? '20rem' : '29rem'
              }
            >
              {labwareRender}
            </LabwareThumbnail>
          </Flex>
          {selectedLiquidId != null ? (
            <LiquidCardList
              selectedLabwareDefinition={labwareDefinition}
              selectedLiquidId={selectedLiquidId ?? ''}
              setSelectedLiquidId={setSelectedLiquidId}
              liquidsInLoadOrder={filteredLiquidsInLoadOrder}
              liquidsByIdForLabware={liquidsByIdForLabware}
            />
          ) : null}
        </Flex>
      </Box>
    </Modal>
  )
}
