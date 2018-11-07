// @flow
import {createSelector} from 'reselect'
import reduce from 'lodash/reduce'
import get from 'lodash/get'
import {getAllPipetteNames, getPipetteNameSpecs, getLabware} from '@opentrons/shared-data'

import type {DropdownOption} from '@opentrons/components'
import type {PipetteData} from '../step-generation'
import type {RootState} from './reducers'

type PipettesById = {[pipetteId: string]: PipetteData}
type RootSlice = {pipettes: RootState}

type Selector<T> = (RootSlice) => T

export const rootSelector = (state: {pipettes: RootState}) => state.pipettes

export const pipettesById: Selector<PipettesById> = createSelector(
  rootSelector,
  pipettes => pipettes.byId
)

export const pipetteIdsByMount: Selector<*> = createSelector(
  rootSelector,
  pipettes => pipettes.byMount
)

function _getPipetteName (pipetteData): string {
  const result = getAllPipetteNames().find(pipetteModel => {
    const p = getPipetteNameSpecs(pipetteModel)
    return p && (
      p.channels === pipetteData.channels &&
      p.maxVolume === pipetteData.maxVolume
    )
  })
  if (!result) {
    console.error('_getPipetteName: No name found for given pipette')
    return '???'
  }
  const pipette = getPipetteNameSpecs(result)
  return pipette ? pipette.displayName : '???'
}

export const equippedPipetteOptions: Selector<Array<DropdownOption>> = createSelector(
  rootSelector,
  pipettes => {
    const byId = pipettes.byId

    const pipetteIds: Array<?string> = [pipettes.byMount.left, pipettes.byMount.right]
    return pipetteIds.reduce((acc: Array<DropdownOption>, pipetteId: ?string): Array<DropdownOption> =>
      (pipetteId && byId[pipetteId])
        ? [
          ...acc,
          {
            name: _getPipetteName(byId[pipetteId]),
            value: pipetteId,
          },
        ]
        : acc,
    [])
  }
)

// Shows equipped (left & right) pipettes by ID, not mount
export const equippedPipettes: Selector<PipettesById> = createSelector(
  rootSelector,
  pipettes => reduce(pipettes.byMount, (acc: PipettesById, pipetteId: string): PipettesById => {
    const pipetteData = pipettes.byId[pipetteId]
    if (!pipetteData) return acc
    return {
      ...acc,
      [pipetteId]: pipetteData,
    }
  }, {})
)

// Formats pipette data specifically for instrumentgroup
export const pipettesForInstrumentGroup: Selector<*> = createSelector(
  rootSelector,
  pipettes => [pipettes.byMount.left, pipettes.byMount.right].reduce((acc, pipetteId) => {
    if (!pipetteId) return acc

    const pipetteData = pipettes.byId[pipetteId]

    if (!pipetteData) return acc

    const tipVolume = pipetteData.tiprackModel && get(getLabware(pipetteData.tiprackModel), 'metadata.tipVolume')

    const pipetteForInstrumentGroup = {
      mount: pipetteData.mount,
      channels: pipetteData.channels,
      description: _getPipetteName(pipetteData),
      isDisabled: false,
      tiprackModel: tipVolume && `${tipVolume} µl`, // TODO: BC 2018-07-23 tiprack displayName
    }

    return [...acc, pipetteForInstrumentGroup]
  }, [])
)

export const permittedTipracks: Selector<Array<string>> = createSelector(
  equippedPipettes,
  (_equippedPipettes) =>
    reduce(_equippedPipettes, (acc: Array<string>, pipette: PipetteData) => {
      return (pipette.tiprackModel)
        ? [...acc, pipette.tiprackModel]
        : acc
    }, [])
)
