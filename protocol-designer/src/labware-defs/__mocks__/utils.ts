// replace webpack-specific require.context with Node-based glob in tests

import { vi } from 'vitest'
import path from 'path'
import glob from 'glob'
import { getLabwareDefURI } from '@opentrons/shared-data'
import type { LabwareDefinition1 } from '@opentrons/shared-data'
import type { LabwareDefByDefURI } from '../types'

const LABWARE_FIXTURE_PATTERN = path.join(
  __dirname,
  '/protocol-designer/shared-data/labware/fixtures/2/*.json'
)
const allLabware: LabwareDefByDefURI = glob
  .sync(LABWARE_FIXTURE_PATTERN)
  .map(require)
  .filter(d => d.metadata.displayCategory !== 'trash')
  .reduce((acc, d) => ({ ...acc, [getLabwareDefURI(d)]: d }), {})
console.assert(
  Object.keys(allLabware).length > 0,
  `no labware fixtures found, is the path correct? ${LABWARE_FIXTURE_PATTERN}`
)
export const getAllDefinitions = vi.fn(() => allLabware)

export const _getSharedLabware = vi.fn(() => null)

export const getOnlyLatestDefs = vi.fn(() => allLabware)

const LEGACY_LABWARE_FIXTURE_PATTERN = path.join(
  __dirname,
  '/protocol-designer/shared-data/labware/fixtures/1/*.json'
)
const legacyLabwareDefs: LabwareDefinition1[] = glob
  .sync(LEGACY_LABWARE_FIXTURE_PATTERN)
  .map(require)

export const getLegacyLabwareDef = vi.fn(() => {
  return legacyLabwareDefs[0]
})
