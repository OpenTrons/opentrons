import { createSelector } from 'reselect'

import { getIsTiprack } from '@opentrons/shared-data'

import { getItemLabwareDef, getSelectedLabwareDefFrom } from '../transforms'
import {
  OFFSET_KIND_DEFAULT,
  OFFSET_KIND_LOCATION_SPECIFIC,
} from '/app/redux/protocol-runs/constants'

import type { Selector } from 'reselect'
import type { State } from '/app/redux/types'
import type { Vector3D, LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  LPCFlowType,
  LPCLabwareInfo,
  SelectedLwOverview,
} from '/app/redux/protocol-runs'

// Returns all the LPC labware info for the labware used in the current run.
export const selectAllLabwareInfo = (
  runId: string
): Selector<State, LPCLabwareInfo['labware']> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    labware => labware ?? {}
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

// Returns whether the user-selected labware is a tiprack.
// Returns false if there is no user-selected labware.
export const selectIsSelectedLwTipRack = (
  runId: string
): Selector<State, boolean> =>
  createSelector(
    (state: State) => getSelectedLabwareDefFrom(runId, state),
    def => (def != null ? getIsTiprack(def) : false)
  )

// Returns the associated adapter display name for the user-selected labware, if any.
export const selectSelectedLwRelatedAdapterDisplayName = (
  runId: string
): Selector<State, string> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware,
    (state: State) => state?.protocolRuns[runId]?.lpc?.labwareDefs,
    (state: State) => state?.protocolRuns[runId]?.lpc?.protocolData,
    (selectedLabware, labwareDefs, analysis) => {
      const adapterId = selectedLabware?.offsetLocationDetails?.adapterId

      if (selectedLabware == null || labwareDefs == null || analysis == null) {
        console.warn('No selected labware or store not properly initialized.')
        return ''
      }

      return adapterId != null
        ? getItemLabwareDef({
            labwareId: adapterId,
            loadedLabware: analysis.labware,
            labwareDefs,
          })?.metadata.displayName ?? ''
        : ''
    }
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
