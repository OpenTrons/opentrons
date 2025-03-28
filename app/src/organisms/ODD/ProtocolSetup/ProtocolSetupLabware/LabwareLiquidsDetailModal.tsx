import { useState } from 'react'
import styled from 'styled-components'

import {
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  LabwareRender,
  SPACING,
} from '@opentrons/components'
import { parseLiquidsInLoadOrder } from '@opentrons/shared-data'

import { OddModal } from '/app/molecules/OddModal'
import { LiquidCardList } from '/app/molecules/LiquidDetailCard'
import {
  getLiquidsByIdForLabware,
  getDisabledWellFillFromLabwareId,
  getWellGroupForLiquidId,
  getDisabledWellGroupForLiquidId,
} from '/app/transformations/analysis'
import type { LabwareByLiquidId } from '@opentrons/components/src/hardware-sim/ProtocolDeck/types'
import type {
  LabwareDefinition2,
  CompletedProtocolAnalysis,
} from '@opentrons/shared-data'

interface LabwareLiquidsDetailModalProps {
  labwareId: string
  labwareDisplayName: string
  mostRecentAnalysis: CompletedProtocolAnalysis
  closeModal: () => void
  labwareByLiquidId: LabwareByLiquidId
  labwareDefinition: LabwareDefinition2
  stackPosition?: number
}

const LabwareThumbnail = styled.svg`
  transform: scale(1, -1);
  width: 34rem;
  flex-shrink: 0;
`

export const LabwareLiquidsDetailModal = (
  props: LabwareLiquidsDetailModalProps
): JSX.Element | null => {
  const {
    labwareId,
    closeModal,
    labwareByLiquidId,
    labwareDisplayName,
    labwareDefinition,
    stackPosition,
    mostRecentAnalysis,
  } = props
  const commands = mostRecentAnalysis.commands ?? []
  const liquids = parseLiquidsInLoadOrder(
    mostRecentAnalysis?.liquids != null ? mostRecentAnalysis?.liquids : [],
    commands
  )
  const labwareInfo = getLiquidsByIdForLabware(labwareId, labwareByLiquidId)
  const filteredLiquidsInLoadOrder = liquids.filter(liquid => {
    return Object.keys(labwareInfo).some(key => key === liquid.id)
  })
  const [selectedLiquidId, setSelectedLiquidId] = useState<string | undefined>(
    filteredLiquidsInLoadOrder[0].id
  )

  const wellFill = getDisabledWellFillFromLabwareId(
    labwareId,
    liquids,
    labwareByLiquidId,
    selectedLiquidId
  )

  const liquidIds = filteredLiquidsInLoadOrder.map(liquid => liquid.id)
  const disabledLiquidIds = liquidIds.filter(id => id !== selectedLiquidId)
  const labwareRender = (
    <LabwareRender
      definition={labwareDefinition}
      wellFill={wellFill}
      wellLabelOption="SHOW_LABEL_INSIDE"
      highlightedWells={
        selectedLiquidId != null
          ? getWellGroupForLiquidId(labwareInfo, selectedLiquidId)
          : {}
      }
      disabledWells={getDisabledWellGroupForLiquidId(
        labwareInfo,
        disabledLiquidIds
      )}
    />
  )

  return (
    <OddModal
      modalSize="large"
      onOutsideClick={closeModal}
      header={{
        title: labwareDisplayName,
        tagText: stackPosition != null ? stackPosition.toString() : undefined,
        hasExitIcon: true,
        onClick: closeModal,
      }}
    >
      <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} gridGap={SPACING.spacing32}>
        <Flex>
          <LabwareThumbnail
            viewBox={`${labwareDefinition.cornerOffsetFromSlot.x} ${labwareDefinition.cornerOffsetFromSlot.y} ${labwareDefinition.dimensions.xDimension} ${labwareDefinition.dimensions.yDimension}`}
          >
            {labwareRender}
          </LabwareThumbnail>
        </Flex>
        <LiquidCardList
          liquidsInLoadOrder={filteredLiquidsInLoadOrder}
          liquidsByIdForLabware={labwareByLiquidId}
          selectedLiquidId={selectedLiquidId}
          setSelectedLiquidId={setSelectedLiquidId}
          selectedLabwareDefinition={labwareDefinition}
        />
      </Flex>
    </OddModal>
  )
}
