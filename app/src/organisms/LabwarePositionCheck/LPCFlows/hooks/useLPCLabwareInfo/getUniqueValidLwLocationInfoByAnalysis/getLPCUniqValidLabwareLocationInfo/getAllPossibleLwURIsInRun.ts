import type {
  FlexStackerRetrieveRunTimeCommand,
  LoadedLabware,
  RunTimeCommand,
} from '@opentrons/shared-data'

export interface AnalysisLwURIsByLwId {
  [lwId: string]: string
}

// Returns all labware URIs present in the analysis, both in commands
// and the top level "labware" field, keyed by labware id.
// Iterates over all protocol commands, finding those commands which result in
// the creation of labware not present in the protocol analysis top level "labware"
// field.
export function scanAllCommandsForAllLwUrisByLwId(
  analysisLoadedLw: LoadedLabware[],
  analysisCmds: RunTimeCommand[]
): AnalysisLwURIsByLwId {
  const result: AnalysisLwURIsByLwId = {}

  analysisLoadedLw.forEach(loadedLw => {
    result[loadedLw.id] = loadedLw.definitionUri
  })

  analysisCmds.forEach(cmd => {
    switch (cmd.commandType) {
      case 'flexStacker/retrieve':
        {
          const { lw, adapter } = getFlexStackerRetrieveLwAndAdapterInfo(cmd)
          result[lw.id] = lw.uri
          if (adapter != null) {
            result[adapter.id] = adapter.uri
          }
        }
        break
      default:
      // Do nothing.
    }
  })

  return result
}

interface LwIdAndUri {
  id: string
  uri: string
}
interface LwAndAdapterIdAndUri {
  lw: LwIdAndUri
  adapter?: LwIdAndUri
}

// Returns the labware id and uri for the retrieved labware and adapter, if present.
function getFlexStackerRetrieveLwAndAdapterInfo(
  command: FlexStackerRetrieveRunTimeCommand
): LwAndAdapterIdAndUri {
  if (command.result == null) {
    console.error(
      'Expected analysis result for flex stacker command, got none.'
    )
    return { lw: { id: '', uri: '' } }
  } else {
    const {
      labwareId,
      primaryLabwareURI,
      adapterId,
      adapterLabwareURI,
    } = command.result
    const adapterInfo =
      adapterId != null && adapterLabwareURI != null
        ? { id: adapterId, uri: adapterLabwareURI }
        : null
    const lwInfo: LwIdAndUri = { id: labwareId, uri: primaryLabwareURI }

    return adapterInfo == null
      ? { lw: lwInfo }
      : { lw: lwInfo, adapter: adapterInfo }
  }
}
