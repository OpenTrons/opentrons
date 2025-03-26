import { useRef, useState, useEffect } from 'react'
import styled, { css } from 'styled-components'

import {
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  LabwareRender,
  SPACING,
  Tag,
} from '@opentrons/components'
import { parseLiquidsInLoadOrder } from '@opentrons/shared-data'

import { OddModal } from '/app/molecules/OddModal'
import { LiquidDetailCard } from '/app/organisms/LiquidDetailCard'
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
  liquidId?: string
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
    liquidId,
    labwareId,
    closeModal,
    labwareByLiquidId,
    labwareDisplayName,
    labwareDefinition,
    stackPosition,
    mostRecentAnalysis,
  } = props
  const currentLiquidRef = useRef<HTMLDivElement>(null)
  const commands = mostRecentAnalysis.commands ?? []
  const liquids = parseLiquidsInLoadOrder(
    mostRecentAnalysis?.liquids != null ? mostRecentAnalysis?.liquids : [],
    commands
  )
  const labwareInfo = getLiquidsByIdForLabware(labwareId, labwareByLiquidId)
  const labwareWellOrdering = labwareDefinition.ordering
  const filteredLiquidsInLoadOrder = liquids.filter(liquid => {
    return Object.keys(labwareInfo).some(key => key === liquid.id)
  })
  const [selectedValue, setSelectedValue] = useState<typeof liquidId>(
    liquidId ?? filteredLiquidsInLoadOrder[0].id
  )

  const wellFill = getDisabledWellFillFromLabwareId(
    labwareId,
    liquids,
    labwareByLiquidId,
    selectedValue
  )

  const scrollToCurrentItem = (): void => {
    currentLiquidRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => {
    scrollToCurrentItem()
  }, [])
  const HIDE_SCROLLBAR = css`
    ::-webkit-scrollbar {
      display: none;
    }
  `
  const liquidIds = filteredLiquidsInLoadOrder.map(liquid => liquid.id)
  const disabledLiquidIds = liquidIds.filter(id => id !== selectedValue)
  const labwareRender = (
    <LabwareRender
      definition={labwareDefinition}
      wellFill={wellFill}
      wellLabelOption="SHOW_LABEL_INSIDE"
      highlightedWells={
        selectedValue != null
          ? getWellGroupForLiquidId(labwareInfo, selectedValue)
          : {}
      }
      disabledWells={getDisabledWellGroupForLiquidId(
        labwareInfo,
        disabledLiquidIds
      )}
    />
  )
  const liquidCard = filteredLiquidsInLoadOrder.map(liquid => {
    const labwareInfoEntry = Object.entries(labwareInfo).find(
      entry => entry[0] === liquid.id
    )
    return (
      labwareInfoEntry != null && (
        <Flex
          width="100%"
          key={liquid.id}
          ref={selectedValue === liquid.id ? currentLiquidRef : undefined}
        >
          <LiquidDetailCard
            {...liquid}
            liquidId={liquid.id}
            volumeByWell={labwareInfoEntry[1][0].volumeByWell}
            labwareWellOrdering={labwareWellOrdering}
            setSelectedValue={setSelectedValue}
            selectedValue={selectedValue}
          />
        </Flex>
      )
    )
  })
  let title: JSX.Element | string = labwareDisplayName
  if (stackPosition != null) {
    title = (
      <>
        <Tag type="default" text={stackPosition.toString()} />
        {labwareDisplayName}
      </>
    )
  }

  return (
    <OddModal
      modalSize="large"
      onOutsideClick={closeModal}
      header={{
        title: title,
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
        <Flex
          flexDirection={DIRECTION_COLUMN}
          height="23.70375rem"
          css={HIDE_SCROLLBAR}
          minWidth="10.313rem"
          overflowY="scroll"
          gridGap={SPACING.spacing16}
        >
          {liquidCard}
        </Flex>
      </Flex>
    </OddModal>
  )
}
