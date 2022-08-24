import path from 'path'
import uniq from 'lodash/uniq'
import { createSelector } from 'reselect'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import { getPipetteNameSpecs } from '@opentrons/shared-data'

import { createLogger } from '../../logger'
import * as PipetteConstants from '../pipettes/constants'

import type { State } from '../types'
import type {
  ProtocolData,
  ProtocolType,
  ProtocolFile,
  ProtocolPipetteTipRackByMount,
} from './types'

type ProtocolInfoSelector = (
  state: State
) => {
  protocolName: string | null
  lastModified: number | null
  appName: string | null
  appVersion: string | null
}

const log = createLogger(__filename)
const stripDirAndExtension = (f: string): string =>
  path.basename(f, path.extname(f))

export const getProtocolFile = (state: State): ProtocolFile | null =>
  state.protocol.file
export const getProtocolContents = (state: State): string | null =>
  state.protocol.contents

export const getProtocolData = (state: State): ProtocolData | null =>
  state.protocol.data

export const getProtocolFilename: (
  state: State
) => string | null = createSelector(getProtocolFile, file => file?.name ?? null)

// TODO: (ka 2019-06-11): Investigate removing this unused? selector
// export const getProtocolLastModified: NumberSelector = createSelector(
//   getProtocolFile,
//   file => file && file.lastModified
// )

interface LabwareDefinitionBySlotMap {
  [slot: string]: LabwareDefinition2 | null | undefined
}

export const getLabwareDefBySlot: (
  state: State
) => LabwareDefinitionBySlotMap = createSelector(getProtocolData, data => {
  if (data && 'labwareDefinitions' in data && 'labware' in data) {
    const labwareById = data.labware
    const labwareDefinitions = data.labwareDefinitions

    return Object.keys(labwareById).reduce(
      (defsBySlot: LabwareDefinitionBySlotMap, labwareId: string) => {
        const labware = labwareById[labwareId]
        let slot: string =
          // @ts-expect-error(sa, 2021-05-12): data has been type narrowed to be Readonly<ProtocolFileV3<{}>>, which does not have modules
          data.modules && labware.slot in data.modules
            ? // @ts-expect-error(sa, 2021-05-12): data has been type narrowed to be Readonly<ProtocolFileV3<{}>>, which does not have modules
              data.modules[labware.slot].slot
            : labware.slot

        // TODO(mc, 2020-08-04): this is for thermocycler support, and its
        // ugliness is due to deficiences in RPC-based labware state
        // revisit as part of Protocol Sessions project
        if (slot === 'span7_8_10_11') slot = '7'

        if (slot in defsBySlot) {
          log.warn(
            `expected 1 labware per slot, slot ${slot} contains multiple labware`
          )
        }

        defsBySlot[slot] = labwareDefinitions[labware.definitionId]
        return defsBySlot
      },
      {}
    )
  }
  return {}
})

export const getProtocolDisplayData: ProtocolInfoSelector = createSelector(
  getProtocolData,
  getProtocolFilename,
  (_data, name) => {
    const basename = name ? stripDirAndExtension(name) : null

    if (!_data) {
      return {
        protocolName: basename,
        lastModified: null,
        appName: null,
        appVersion: null,
      }
    }

    // TODO(mc, 2020-08-04): this typing doesn't behave; put data access behind
    // a unit tested utility that migrates all data patterns up to latest schema
    const data: any = _data
    const metadata: any | null | undefined = _data.metadata

    const protocolName =
      metadata?.protocolName ?? metadata?.['protocol-name'] ?? basename

    const lastModified =
      metadata?.lastModified ??
      metadata?.['last-modified'] ??
      metadata?.created ??
      null

    const appName =
      data.designerApplication?.name ??
      data['designer-application']?.['application-name'] ??
      null

    const appVersion =
      data.designerApplication?.version ??
      data['designer-application']?.['application-version'] ??
      null

    return {
      protocolName: protocolName,
      lastModified: lastModified,
      appName: appName,
      appVersion: appVersion,
    }
  }
)

export const getProtocolName: (state: State) => string | null = createSelector(
  getProtocolDisplayData,
  displayData => displayData.protocolName
)

export const getProtocolAuthor: (
  state: State
) => string | null = createSelector(
  getProtocolData,
  data => (data?.metadata?.author as string) ?? null
)

export const getProtocolDescription: (
  state: State
) => string | null = createSelector(
  getProtocolData,
  data => (data?.metadata?.description as string) ?? null
)

export const getProtocolSource: (
  state: State
) => string | null = createSelector(getProtocolData, data => {
  return data !== null &&
    'metadata' in data &&
    'source' in data.metadata &&
    typeof data.metadata.source === 'string'
    ? data.metadata.source
    : null
})

export const getProtocolLastUpdated: (
  state: State
) => number | null = createSelector(
  getProtocolFile,
  getProtocolDisplayData,
  (file, displayData) => displayData.lastModified ?? file?.lastModified ?? null
)

export const getProtocolType: (
  state: State
) => ProtocolType | null = createSelector(
  getProtocolFile,
  file => file?.type || null
)

export const getProtocolCreatorApp: (
  state: State
) => {
  name: string | null
  version: string | null
} = createSelector(getProtocolDisplayData, displayData => {
  return {
    name: displayData.appName,
    version: displayData.appVersion,
  }
})

export const getProtocolPipetteTipRacks: (
  state: State
) => ProtocolPipetteTipRackByMount = createSelector(
  getProtocolData,
  protocolData => {
    if (protocolData == null || !('commands' in protocolData)) {
      return { left: null, right: null }
    }
    const { pipettes, labware, labwareDefinitions, commands } = protocolData
    const tipRackCommands = commands.filter(
      commandObject => commandObject.command === 'pickUpTip'
    )
    const protocolPipetteValues = Object.values(pipettes)
    const protocolPipetteKeys = Object.keys(pipettes)

    return PipetteConstants.PIPETTE_MOUNTS.reduce<ProtocolPipetteTipRackByMount>(
      (result, mount) => {
        const pipetteOnMount = protocolPipetteValues.find(
          pipette => pipette.mount === mount
        )
        if (pipetteOnMount !== undefined) {
          const index = protocolPipetteValues.indexOf(pipetteOnMount)
          const pipetteKey = protocolPipetteKeys[index]
          let tipRackDefs = new Array<LabwareDefinition2>()
          tipRackCommands.forEach(command => {
            if (
              'pipette' in command.params &&
              'labware' in command.params &&
              pipetteKey === command.params.pipette
            ) {
              const tipRack = labware[command.params.labware]
              const tipRackDefinition = labwareDefinitions[tipRack.definitionId]
              if (tipRackDefinition !== undefined) {
                tipRackDefs.push(tipRackDefinition)
              }
            }
            tipRackDefs = uniq(tipRackDefs)
          })
          result[mount] = {
            pipetteSpecs: getPipetteNameSpecs(pipetteOnMount.name),
            tipRackDefs: tipRackDefs,
          }
        } else {
          result[mount] = null
        }
        return result
      },
      { left: null, right: null }
    )
  }
)
