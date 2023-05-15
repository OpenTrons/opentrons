import { createSelector } from 'reselect'
import {
  _getSharedLabware,
  getAllDefinitions,
  getOt3AllDefinitions,
} from './utils'
import { LabwareDefinition2 } from '@opentrons/shared-data'
import { BaseState, Selector } from '../types'
import { LabwareDefByDefURI, LabwareUploadMessage } from './types'
import { RootState } from './reducers'
import { RootState as StepFormRootState } from '../step-forms'
// NOTE: labware-defs/ state is nested inside step-forms
export const rootSelector = (state: BaseState): RootState =>
  state.stepForms.labwareDefs

const _getLabwareDef = (
  customDefs: LabwareDefByDefURI,
  labwareDefURI: string
): LabwareDefinition2 => {
  const customDef = customDefs[labwareDefURI]
  if (customDef) return customDef

  const sharedDataDef = _getSharedLabware(labwareDefURI)

  if (sharedDataDef) return sharedDataDef
  throw Error(
    `No labware definition in PD session's custom labware or builtin shared-data defs for labwareDefURI "{labwareDefURI}"`
  )
}

const _makeCustomLabwareDefsObj = (
  customDefs: LabwareDefByDefURI
): LabwareDefByDefURI => {
  const allCustomIds = Object.keys(customDefs)
  const customDefsById = allCustomIds.reduce(
    (acc, id) => ({ ...acc, [id]: _getLabwareDef(customDefs, id) }),
    {}
  )
  return { ...customDefsById }
}

const _makeAllLabwareDefsObj = (
  customDefs: LabwareDefByDefURI
): Record<string, LabwareDefinition2> => {
  return { ...getAllDefinitions(), ..._makeCustomLabwareDefsObj(customDefs) }
}

const _makeAllLabwareDefsObjOt3 = (
  customDefs: LabwareDefByDefURI
): Record<string, LabwareDefinition2> => {
  return {
    ...getOt3AllDefinitions(),
    ..._makeCustomLabwareDefsObj(customDefs),
  }
}

export const _getLabwareDefsByIdRootState: (
  arg0: StepFormRootState
) => LabwareDefByDefURI = createSelector(
  (rootState: StepFormRootState) => rootState.labwareDefs.customDefs,
  _makeAllLabwareDefsObj
)
export const getLabwareDefsByURI: Selector<LabwareDefByDefURI> = createSelector(
  state => rootSelector(state).customDefs,
  _makeAllLabwareDefsObj
)
export const getOt3LabwareDefsByURI: Selector<LabwareDefByDefURI> = createSelector(
  state => rootSelector(state).customDefs,
  _makeAllLabwareDefsObjOt3
)
export const getCustomLabwareDefsByURI: Selector<LabwareDefByDefURI> = createSelector(
  state => rootSelector(state).customDefs,
  _makeCustomLabwareDefsObj
)
export const getLabwareUploadMessage: Selector<
  LabwareUploadMessage | null | undefined
> = state => rootSelector(state).labwareUploadMessage
