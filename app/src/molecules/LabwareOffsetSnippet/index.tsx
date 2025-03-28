import { useState, useEffect } from 'react'
import styled from 'styled-components'

import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { TYPOGRAPHY, SPACING, BORDERS, COLORS } from '@opentrons/components'

import { createSnippet } from './createSnippet'

import type {
  LabwareOffsetCreateData,
  LegacyLabwareOffsetCreateData,
} from '@opentrons/api-client'
import type {
  RunTimeCommand,
  LoadedLabware,
  LoadedModule,
  RobotType,
} from '@opentrons/shared-data'

export interface LabwareOffsetSnippetProps {
  mode: 'jupyter' | 'cli'
  commands: RunTimeCommand[]
  labware: LoadedLabware[]
  modules: LoadedModule[]
  robotType: RobotType
  labwareOffsets?: LegacyLabwareOffsetCreateData[] | LabwareOffsetCreateData[]
  onSnippetUpdate?: (snippetText: string) => void
}

export function LabwareOffsetSnippet(
  props: LabwareOffsetSnippetProps
): JSX.Element | null {
  const { labware, labwareOffsets, mode, robotType, onSnippetUpdate } = props

  const [snippet, setSnippet] = useState<string | null>(null)

  useEffect(() => {
    if (labware.length > 0 && labwareOffsets != null) {
      const generatedSnippet = createSnippet(props)
      setSnippet(generatedSnippet)

      if (onSnippetUpdate != null && generatedSnippet != null) {
        onSnippetUpdate(generatedSnippet)
      }
    }
  }, [labware, labwareOffsets, mode, onSnippetUpdate])

  return robotType === FLEX_ROBOT_TYPE ? (
    <JsonTextArea readOnly value={snippet ?? ''} spellCheck={false} />
  ) : (
    <LegacyJsonTextArea readOnly value={snippet ?? ''} spellCheck={false} />
  )
}

const JsonTextArea = styled.textarea`
  height: 10.375rem;
  width: 100%;

  background-color: ${COLORS.grey30};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing4} ${SPACING.spacing24} ${SPACING.spacing4}
    ${SPACING.spacing12};

  font-size: 0.813rem;
  font-family: monospace;
  resize: none;
  line-height: 20px;
`

const LegacyJsonTextArea = styled.textarea`
  min-height: 28vh;
  width: 100%;
  background-color: ${COLORS.grey30};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing8};
  margin: ${SPACING.spacing16} 0;
  font-size: ${TYPOGRAPHY.fontSizeCaption};
  font-family: monospace;
  resize: none;
`
