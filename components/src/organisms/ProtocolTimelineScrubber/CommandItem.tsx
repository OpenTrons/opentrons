import { useState } from 'react'
import { Flex } from '../../primitives'
import { COLORS } from '../../helix-design-system'
import { SPACING } from '../../ui-style-constants'
import { ALIGN_FLEX_END, DIRECTION_COLUMN, OVERFLOW_SCROLL } from '../../styles'
import { LegacyStyledText } from '../../atoms'
import { COMMAND_WIDTH_PX } from './index'
import { CommandText } from '../CommandText'
import { getCommandTextData } from './utils'
import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
  ProtocolAnalysisOutput,
  RobotType,
  RunTimeCommand,
} from '@opentrons/shared-data'

interface CommandItemProps {
  command: RunTimeCommand
  index: number
  currentCommandIndex: number
  setCurrentCommandIndex: (index: number) => void
  analysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput
  robotType: RobotType
  allRunDefs: LabwareDefinition2[]
}
export function CommandItem({
  index,
  command,
  currentCommandIndex,
  setCurrentCommandIndex,
  analysis,
  robotType,
  allRunDefs,
}: CommandItemProps): JSX.Element {
  const [showDetails, setShowDetails] = useState(false)
  const params: RunTimeCommand['params'] = command.params ?? {}
  return (
    <Flex
      key={index}
      backgroundColor={
        index === currentCommandIndex
          ? COLORS.blue35
          : index < currentCommandIndex
          ? '#00002222'
          : COLORS.white
      }
      border={
        index === currentCommandIndex
          ? `1px solid ${COLORS.blue35}`
          : '1px solid #000'
      }
      padding={SPACING.spacing4}
      flexDirection={DIRECTION_COLUMN}
      minWidth={`${COMMAND_WIDTH_PX}px`}
      width={`${COMMAND_WIDTH_PX}px`}
      height="6rem"
      overflowX="hidden"
      overflowY={OVERFLOW_SCROLL}
      cursor="pointer"
      onClick={() => {
        setCurrentCommandIndex(index)
      }}
    >
      <LegacyStyledText
        onClick={() => {
          setShowDetails(!showDetails)
        }}
        as="p"
        alignSelf={ALIGN_FLEX_END}
      >
        {index + 1}
      </LegacyStyledText>
      <CommandText
        command={command}
        commandTextData={getCommandTextData(analysis)}
        robotType={robotType}
        allRunDefs={allRunDefs}
      />
      {showDetails
        ? Object.entries(params).map(([key, value]) => (
            <Flex
              key={key}
              flexDirection={DIRECTION_COLUMN}
              marginBottom={SPACING.spacing2}
              paddingLeft={SPACING.spacing2}
            >
              <LegacyStyledText as="label" marginRight={SPACING.spacing2}>
                {key}:
              </LegacyStyledText>
              {value != null && typeof value === 'object' ? (
                /*  eslint-disable @typescript-eslint/no-unsafe-argument */
                Object.entries(value).map(([innerKey, innerValue]) => (
                  <Flex key={innerKey}>
                    <LegacyStyledText as="label" marginRight={SPACING.spacing2}>
                      {key}:
                    </LegacyStyledText>
                    <LegacyStyledText as="p" title={String(innerValue)}>
                      {String(innerValue)}
                    </LegacyStyledText>
                  </Flex>
                ))
              ) : (
                <LegacyStyledText as="p" title={String(value)}>
                  {String(value)}
                </LegacyStyledText>
              )}
            </Flex>
          ))
        : null}
    </Flex>
  )
}
