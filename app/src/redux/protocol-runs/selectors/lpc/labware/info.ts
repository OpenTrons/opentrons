import type { Selector } from 'reselect'
import { createSelector } from 'reselect'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import { getIsTiprack, getLabwareDefURI } from '@opentrons/shared-data'

import {
  getAreAnyLocationSpecificOffsetsMissing,
  getIsDefaultOffsetAbsent,
  getItemLabwareDef,
  getSelectedLabwareDefFrom,
} from '../transforms'
import {
  OFFSET_KIND_DEFAULT,
  OFFSET_KIND_LOCATION_SPECIFIC,
  OFFSETS_SOURCE_INITIALIZING,
} from '/app/redux/protocol-runs/constants'
import type { State } from '/app/redux/types'
import type {
  ConflictTimestampInfo,
  LPCFlowType,
  LwGeometryDetails,
  OffsetSources,
  SelectedLwOverview,
} from '/app/redux/protocol-runs'

export interface LPCLabwareInfoAndDefaultStatus {
  uri: string
  info: LwGeometryDetails
  isMissingNecessaryDefaultOffset: boolean
}

// Returns all the LPC labware info for the labware used in the current run,
// sorted by URI display name. Default offsets are not marked missing if all location
// specific offset vectors for the uri are present or the offsets are hardcoded.
export const selectAllLabwareInfoAndDefaultStatusSorted = (
  runId: string
): Selector<State, LPCLabwareInfoAndDefaultStatus[]> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    labwareInfo => {
      if (labwareInfo == null) {
        return []
      }

      return Object.entries(labwareInfo)
        .map(([uri, info]) => {
          const isMissingNecessaryDefaultOffset = getAreAnyLocationSpecificOffsetsMissing(
            info.locationSpecificOffsetDetails
          )
            ? getIsDefaultOffsetAbsent(info)
            : false

          return {
            uri,
            info,
            isMissingNecessaryDefaultOffset,
          }
        })
        .sort((a, b) => {
          if (
            a.isMissingNecessaryDefaultOffset !==
            b.isMissingNecessaryDefaultOffset
          ) {
            return a.isMissingNecessaryDefaultOffset ? -1 : 1
          }

          return a.info.displayName.localeCompare(b.info.displayName)
        })
    }
  )

// Returns the labware overview for the currently user-selected labware, if any.
export const selectSelectedLwOverview = (
  runId: string
): Selector<State, SelectedLwOverview | null> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware,
    selectedLabware => selectedLabware ?? null
  )

// Returns the current edit offset flow type that the user is performing, if any.
export const selectSelectedLwFlowType = (
  runId: string
): Selector<State, LPCFlowType | null> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware,
    selectedLabware => {
      if (selectedLabware?.offsetLocationDetails == null) {
        return null
      } else {
        if (
          selectedLabware.offsetLocationDetails.kind === OFFSET_KIND_DEFAULT
        ) {
          return OFFSET_KIND_DEFAULT
        } else {
          return OFFSET_KIND_LOCATION_SPECIFIC
        }
      }
    }
  )

// Returns the display name for the user-selected labware, if any.
export const selectSelectedLwDisplayName = (
  runId: string
): Selector<State, string> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware?.uri,
    (lw, uri) => {
      if (lw == null || uri == null) {
        console.warn('Cannot access invalid labware')
        return ''
      } else {
        return lw[uri].displayName
      }
    }
  )

// Returns the display name for a labware, if any.
export const selectLwDisplayName = (
  runId: string,
  uri: string
): Selector<State, string> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareDefs,
    lwDefs => {
      if (lwDefs == null) {
        console.warn('Cannot access invalid labware')
        return ''
      } else {
        const matchingLw = lwDefs.find(def => getLabwareDefURI(def) === uri)
        if (matchingLw == null) {
          console.error(
            `Expected to find a matching lw def but did not for ${uri}`
          )
          return ''
        } else {
          return matchingLw.metadata.displayName
        }
      }
    }
  )

// Returns whether the user-selected labware is a tiprack.
// Returns false if there is no user-selected labware.
export const selectIsSelectedLwTipRack = (
  runId: string
): Selector<State, boolean> =>
  createSelector(
    (state: State) => getSelectedLabwareDefFrom(runId, state),
    def => (def != null ? getIsTiprack(def) : false)
  )

// Returns the labware definition for the user-selected labware, if any.
export const selectSelectedLwDef = (
  runId: string
): Selector<State, LabwareDefinition2 | null> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware,
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareDefs,
    (state: State) => state.protocolRuns[runId]?.lpc?.protocolData.labware,
    (selectedLabware, labwareDefs, loadedLabware) => {
      if (
        selectedLabware == null ||
        labwareDefs == null ||
        loadedLabware == null
      ) {
        console.warn('No selected labware or store not properly initialized.')
        return null
      } else {
        return getItemLabwareDef({
          labwareId: selectedLabware.id,
          labwareDefs,
          loadedLabware,
        })
      }
    }
  )

export const selectConflictTimestampInfo = (
  runId: string
): Selector<State, ConflictTimestampInfo> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.conflictTimestampInfo,
    ts => ts ?? { timestamp: null, isInitialized: false }
  )

export const selectOffsetSource = (
  runId: string
): Selector<State, OffsetSources> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.sourcedOffsets,
    source => source ?? OFFSETS_SOURCE_INITIALIZING
  )
