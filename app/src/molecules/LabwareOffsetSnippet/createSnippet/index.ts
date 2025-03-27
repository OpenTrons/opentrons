import { CLI_PREFIX, JUPYTER_PREFIX, PYTHON_INDENT } from './constants'
import { buildLoadCommandCopy } from './buildLoadCommandCopy'

import type { LabwareOffsetSnippetProps } from '/app/molecules/LabwareOffsetSnippet'

// Returns code snippets with conditional styling based on the snippet mode.
// Only labware that is LPC-able includes the set_offset() snippet.
export function createSnippet({
  mode,
  modules,
  commands,
  labware,
  labwareOffsets,
}: LabwareOffsetSnippetProps): string | null {
  const loadCommandLines = buildLoadCommandCopy(
    commands,
    labware,
    modules,
    labwareOffsets
  )
  return formatSnippet(loadCommandLines, mode)
}

function formatSnippet(loadCommandLines: string[], mode: string): string {
  const prefix = mode === 'jupyter' ? JUPYTER_PREFIX : CLI_PREFIX
  const indent = mode === 'jupyter' ? '' : PYTHON_INDENT

  return loadCommandLines.reduce<string>((acc, line) => {
    return `${acc}\n${indent}${line}`
  }, prefix)
}
