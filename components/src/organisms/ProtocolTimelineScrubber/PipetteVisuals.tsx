import { useState } from 'react'
import { Box, Flex } from '../../primitives'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  TEXT_TRANSFORM_UPPERCASE,
} from '../../styles'
import { LegacyStyledText } from '../../atoms'
import { SPACING, TYPOGRAPHY } from '../../ui-style-constants'
import { COLORS } from '../../helix-design-system'
import type {
  CompletedProtocolAnalysis,
  ProtocolAnalysisOutput,
} from '@opentrons/shared-data'
import type {
  LocationLiquidState,
  PipetteEntity,
  TimelineFrame,
} from '@opentrons/step-generation'

interface PipetteMountVizProps {
  pipetteId: string | null
  pipetteEntity: PipetteEntity | null
  mount: string
  timelineFrame: TimelineFrame
  analysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput
}
export function PipetteMountViz(
  props: PipetteMountVizProps
): JSX.Element | null {
  const { mount, pipetteEntity, pipetteId, timelineFrame, analysis } = props
  const [showPipetteDetails, setShowPipetteDetails] = useState(false)

  return pipetteEntity == null ? null : (
    <Flex
      alignItems={ALIGN_CENTER}
      flexDirection={DIRECTION_COLUMN}
      maxWidth="4rem"
    >
      <LegacyStyledText
        as="h1"
        textTransform={TEXT_TRANSFORM_UPPERCASE}
        cursor="pointer"
        onClick={() => {
          setShowPipetteDetails(!showPipetteDetails)
        }}
      >
        {mount}
      </LegacyStyledText>
      {showPipetteDetails ? (
        <LegacyStyledText
          as="p"
          fontSize={TYPOGRAPHY.fontSizeCaption}
          marginY={SPACING.spacing8}
        >
          {pipetteEntity?.spec?.displayName ?? 'none'}
        </LegacyStyledText>
      ) : null}
      {pipetteEntity != null && pipetteId != null ? (
        <PipetteSideView
          allNozzlesHaveTips={timelineFrame.tipState.pipettes[pipetteId]}
          allNozzleTipContents={Object.values(
            timelineFrame.liquidState.pipettes[pipetteId]
          )}
          maxVolume={
            pipetteEntity != null
              ? pipetteEntity.spec.liquids.default.maxVolume
              : 0
          }
          analysis={analysis}
        />
      ) : (
        <Box size="4rem" />
      )}
    </Flex>
  )
}

interface SideViewProps {
  allNozzleTipContents: LocationLiquidState[]
  maxVolume: number
  allNozzlesHaveTips: boolean
  analysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput
}
export function PipetteSideView({
  allNozzleTipContents,
  maxVolume,
  allNozzlesHaveTips,
  analysis,
}: SideViewProps): JSX.Element {
  const channelCount = Math.min(Object.keys(allNozzleTipContents).length, 8)

  return (
    <svg width="4rem" height="16rem" viewBox="0 0 100 200">
      {channelCount <= 1 ? (
        <>
          <rect x="30" y="0" height="80" width="40" stroke="#000" />
          <rect x="45" y="80" height="50" width="10" stroke="#000" />
          {allNozzlesHaveTips ? (
            <TipSideView
              x={45}
              y={130}
              tipContents={allNozzleTipContents[0]}
              maxVolume={maxVolume}
              analysis={analysis}
            />
          ) : (
            <path
              d="M47,130 L49,140 H51 L53,130 H47z"
              stroke="#000"
              fill="#000"
            />
          )}
        </>
      ) : (
        <>
          <rect x="30" y="0" height="40" width="40" stroke="#000" />
          <path d="M30,40 L10,85 H90 L70,40 H30z" stroke="#000" />
          <rect x="10" y="85" height="45" width="80" stroke="#000" />
          {Object.values(allNozzleTipContents)
            .slice(0, 8)
            .map((tipContents, index) => {
              const x = index * 10 + 10
              return allNozzlesHaveTips ? (
                <TipSideView
                  x={x}
                  y={130}
                  key={index}
                  tipContents={tipContents}
                  maxVolume={maxVolume}
                  analysis={analysis}
                />
              ) : (
                <path
                  d={`M${x + 2},130 L${x + 4},140 H${x + 6} L${x + 8},130 H${
                    x + 2
                  }z`}
                  stroke="#000"
                  fill="#000"
                />
              )
            })}
        </>
      )}
    </svg>
  )
}

export interface TipSideViewProps {
  tipContents: LocationLiquidState
  maxVolume: number
  x: number
  y: number
  analysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput
}
function TipSideView({
  tipContents,
  maxVolume,
  x,
  y,
  analysis,
}: TipSideViewProps): JSX.Element {
  const emptyVolumeLeft =
    maxVolume -
    Object.entries(tipContents).reduce((acc, [liquidId, { volume }]) => {
      if (liquidId === '__air__') return acc
      return acc + volume
    }, 0)
  const yOfFirstLiquid = (emptyVolumeLeft / maxVolume) * 50

  return (
    <>
      <rect
        x={x}
        y={y}
        height={yOfFirstLiquid}
        width="10"
        fill={COLORS.white}
      />
      {Object.entries(tipContents).map(([liquidId, { volume }]) => {
        if (liquidId === '__air__') return null
        const displayColor = analysis.liquids.find(l => l.id === liquidId)
          ?.displayColor
        return (
          <rect
            key={liquidId}
            x={x}
            y={y + yOfFirstLiquid}
            height={(volume / maxVolume) * 50}
            width="10"
            fill={displayColor ?? 'rebeccapurple'}
          />
        )
      })}
      <path
        d={`M${x},130 V150 L${x + 2},170 L${x + 4},180 H${x + 6} L${
          x + 8
        },170 L${x + 10},150 V130 H${x}z`}
        stroke="#000"
        fill="none"
      />
      <path
        d={`M${x - 1},129 V150 L${x + 2},170 L${x + 4},180 H${x + 6} L${
          x + 8
        },170 L${x + 10},150 V130 H${x + 11} V181 H${x - 1} V129z`}
        fill={COLORS.white}
        stroke="none"
      />
    </>
  )
}
