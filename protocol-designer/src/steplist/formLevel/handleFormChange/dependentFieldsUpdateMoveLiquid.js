// @flow
import makeConditionalPatchUpdater from './makeConditionalPatchUpdater'
import {chainPatchUpdaters, getChannels, getAllWellsFromPrimaryWells} from './utils'
import {getPipetteCapacity} from '../../../pipettes/pipetteData'
import {getWellRatio} from '../../utils'
import type {FormData} from '../../../form-types'
import type {FormPatch} from '../../actions/types'
import type {LabwareEntities, PipetteEntities} from '../../../step-forms/types'

const wellRatioUpdatesMap = [
  {
    prevValue: 'n:n',
    nextValue: '1:many',
    dependentFields: [
      {name: 'changeTip', prevValue: 'perSource', nextValue: 'always'},
      {name: 'changeTip', prevValue: 'perDest', nextValue: 'always'},
    ],
  },
  {
    prevValue: 'n:n',
    nextValue: 'many:1',
    dependentFields: [
      // no updates, all possible values are OK
    ],
  },
  {
    prevValue: '1:many',
    nextValue: 'n:n',
    dependentFields: [
      {name: 'changeTip', prevValue: 'perSource', nextValue: 'always'},
      {name: 'changeTip', prevValue: 'perDest', nextValue: 'always'},
    ],
  },
  {
    prevValue: '1:many',
    nextValue: 'many:1',
    dependentFields: [
      {name: 'changeTip', prevValue: 'perSource', nextValue: 'always'},
      {name: 'changeTip', prevValue: 'perDest', nextValue: 'always'},
      {name: 'path', prevValue: 'multiDispense', nextValue: 'single'},
    ],
  },
  {
    prevValue: 'many:1',
    nextValue: 'n:n',
    dependentFields: [
      {name: 'path', prevValue: 'multiAspirate', nextValue: 'single'},
    ],
  },
  {
    prevValue: 'many:1',
    nextValue: '1:many',
    dependentFields: [
      {name: 'changeTip', prevValue: 'perSource', nextValue: 'always'},
      {name: 'path', prevValue: 'multiAspirate', nextValue: 'single'},
    ],
  },
]
const wellRatioUpdater = makeConditionalPatchUpdater(wellRatioUpdatesMap)

export function updatePatchPathField (patch: FormPatch, rawForm: FormData, pipetteEntities: PipetteEntities) {
  const appliedPatch = {...rawForm, ...patch}
  const {path, changeTip} = appliedPatch
  // pass-thru: incomplete form
  if (!path) return patch

  const numericVolume = Number(appliedPatch.volume) || 0
  const pipetteCapacity = getPipetteCapacity(pipetteEntities[appliedPatch.pipette])
  let pipetteCapacityExceeded = numericVolume > pipetteCapacity

  if (appliedPatch.volume && appliedPatch.pipette && appliedPatch.pipette in pipetteEntities) {
    // TODO IMMEDIATELY make this a util, and search for other places this happens
    if (pipetteCapacity) {
      if (!pipetteCapacityExceeded && ['multiDispense', 'multiAspirate'].includes(appliedPatch.path)) {
        const disposalVolume = (appliedPatch.disposalVolume_checkbox && appliedPatch.disposalVolume_volume) ? appliedPatch.disposalVolume_volume : 0
        pipetteCapacityExceeded = ((numericVolume * 2) + disposalVolume) > pipetteCapacity
      }
    }
  }

  if (pipetteCapacityExceeded) {
    return {...patch, path: 'single'}
  }

  // changeTip value incompatible with next path value
  const incompatiblePath = (
    (changeTip === 'perSource' && path === 'multiAspirate') ||
    (changeTip === 'perDest' && path === 'multiDispense'))

  if (pipetteCapacityExceeded || incompatiblePath) {
    return {...patch, path: 'single'}
  }
  return patch
}

const updatePatchOnLabwareChange = (patch: FormPatch, rawForm: FormData): FormPatch => {
  const sourceLabwareChanged = patch.aspirate_labware &&
    patch.aspirate_labware !== rawForm.aspirate_labware
  const destLabwareChanged = patch.dispense_labware &&
    patch.dispense_labware !== rawForm.dispense_labware

  if (!sourceLabwareChanged && !destLabwareChanged) return patch

  return {
    ...(sourceLabwareChanged
      ? {
        'aspirate_wells': null,
        'aspirate_mmFromBottom': null,
        'aspirate_touchTipMmFromBottom': null,
      } : {}),
    ...(destLabwareChanged
      ? {
        'dispense_wells': null,
        'dispense_mmFromBottom': null,
        'dispense_touchTipMmFromBottom': null,
      } : {}),
  }
}

const updatePatchOnPipetteChange = (
  patch: FormPatch,
  rawForm: FormData,
  pipetteEntities: PipetteEntities
) => {
  // when pipette ID is changed (to another ID, or to null),
  // set any flow rates, mix volumes, air gaps, or disposal volumes to null
  if (patch.pipette !== undefined && rawForm.pipette !== patch.pipette) {
    return {
      ...patch,
      aspirate_flowRate: null,
      dispense_flowRate: null,
      aspirate_mix_volume: null,
      dispense_mix_volume: null,
      disposalVolume_volume: null,
    }
  }

  return patch
}

const updatePatchOnPipetteChannelChange = (
  patch: FormPatch,
  rawForm: FormData,
  labwareEntities: LabwareEntities,
  pipetteEntities: PipetteEntities
) => {
  if (patch.pipette === undefined) return patch
  let update = {}

  const prevChannels = getChannels(rawForm.pipette, pipetteEntities)
  const nextChannels = typeof patch.pipette === 'string'
    ? getChannels(patch.pipette, pipetteEntities)
    : null

  const singleToMulti = prevChannels === 1 && nextChannels === 8
  const multiToSingle = prevChannels === 8 && nextChannels === 1

  if (patch.pipette === null || singleToMulti) {
    // clear all well selection
    update = {aspirate_wells: null, dispense_wells: null}
  } else if (multiToSingle) {
    // multi-channel to single-channel: convert primary wells to all wells
    const sourceLabwareId = rawForm.aspirate_labware
    const destLabwareId = rawForm.dispense_labware

    const sourceLabware = sourceLabwareId && labwareEntities[sourceLabwareId]
    const sourceLabwareType = sourceLabware && sourceLabware.type
    const destLabware = destLabwareId && labwareEntities[destLabwareId]
    const destLabwareType = destLabware && destLabware.type

    update = {
      aspirate_wells: getAllWellsFromPrimaryWells(rawForm.aspirate_wells, sourceLabwareType),
      dispense_wells: getAllWellsFromPrimaryWells(rawForm.dispense_wells, destLabwareType),
    }
  }
  return {...patch, ...update}
}

export default function dependentFieldsUpdateMoveLiquid (
  originalPatch: FormPatch,
  rawForm: FormData, // raw = NOT hydrated
  pipetteEntities: PipetteEntities,
  labwareEntities: LabwareEntities
): FormPatch {
  const updatePatchOnWellRatioChange = (chainPatch) => {
    const prevWellRatio = getWellRatio(rawForm.aspirate_wells, rawForm.dispense_wells)
    const nextWellRatio = getWellRatio(chainPatch.aspirate_wells, chainPatch.dispense_wells)

    if (prevWellRatio && nextWellRatio) {
      return wellRatioUpdater(prevWellRatio, nextWellRatio, {...rawForm, ...chainPatch})
    }
    return chainPatch
  }

  // sequentially modify parts of the patch until it's fully updated
  return chainPatchUpdaters(originalPatch, [
    chainPatch => updatePatchOnLabwareChange(chainPatch, rawForm),
    chainPatch => updatePatchOnPipetteChannelChange(chainPatch, rawForm, labwareEntities, pipetteEntities),
    chainPatch => updatePatchOnPipetteChange(chainPatch, rawForm, pipetteEntities),
    chainPatch => updatePatchPathField(chainPatch, rawForm, pipetteEntities),
    updatePatchOnWellRatioChange,
  ])
}
