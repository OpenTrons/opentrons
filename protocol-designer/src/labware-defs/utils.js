// @flow
import {
  getLabwareDefURI,
  type LabwareDefinition2,
} from '@opentrons/shared-data'
import type { LabwareDefByDefURI } from './types'
// TODO: Ian 2019-04-11 getAllDefinitions also exists (differently) in labware-library,
// should reconcile differences & make a general util fn imported from shared-data

// require all definitions in the labware/definitions/2 directory
// $FlowFixMe: require.context is webpack-specific method
const definitionsContext = require.context(
  '@opentrons/shared-data/labware/definitions/2',
  true, // traverse subdirectories
  /\.json$/, // import filter
  'sync' // load every definition into one synchronous chunk
)

let definitions = null

export function getAllDefinitions(): LabwareDefByDefURI {
  // NOTE: unlike labware-library, no filtering out trashes here (we need 'em)
  // also, more convenient & performant to make a map {labwareDefURI: def} not an array
  if (!definitions) {
    definitions = definitionsContext.keys().reduce((acc, filename) => {
      const def = definitionsContext(filename)
      const labwareDefURI = getLabwareDefURI(def)
      return { ...acc, [labwareDefURI]: def }
    }, {})
  }

  return definitions
}

// NOTE: this is different than labware library,
// in PD we wanna get always by labware URI (namespace/loadName/version) never by loadName
export function _getSharedLabware(labwareDefURI: string): ?LabwareDefinition2 {
  return getAllDefinitions()[labwareDefURI] || null
}
