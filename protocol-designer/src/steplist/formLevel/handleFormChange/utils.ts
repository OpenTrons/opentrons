import round from 'lodash/round'
import uniq from 'lodash/uniq'
import {
  getWellSetForMultichannel,
  canPipetteUseLabware,
} from '/protocol-designer/utils'
import { getPipetteCapacity } from '/protocol-designer/pipettes/pipetteData'
import type {
  LabwareDefinition2,
  PipetteChannels,
} from '@opentrons/shared-data'
import type {
  LabwareEntities,
  PipetteEntities,
} from '@opentrons/step-generation'
import type { FormPatch } from '/protocol-designer/steplist/actions/types'
import type {
  FormData,
  PathOption,
  StepFieldName,
} from '/protocol-designer/form-types'
export function chainPatchUpdaters(
  initialPatch: FormPatch,
  fns: Array<(arg0: FormPatch) => FormPatch>
): FormPatch {
  return fns.reduce((patchAcc: FormPatch, fn) => {
    return fn(patchAcc)
  }, initialPatch)
}
// given an array of primary wells (for a multichannel), return all unique wells
// included in that set. Used to convert multi to single.
export function getAllWellsFromPrimaryWells(
  primaryWells: string[],
  labwareDef: LabwareDefinition2,
  channels: 8 | 96
): string[] {
  const allWells = primaryWells.reduce((acc: string[], well: string) => {
    const nextWellSet = getWellSetForMultichannel({
      labwareDef,
      wellName: well,
      channels,
    })

    // filter out any nulls (but you shouldn't get any)
    if (!nextWellSet) {
      console.warn(`got empty well set, something weird may be happening`, {
        primaryWells,
        labwareDef,
      })
    }

    return nextWellSet ? [...acc, ...nextWellSet] : acc
  }, [])
  // remove duplicates (eg trough: [A1, A1, A1, A1, A1, A1, A1, A1] -> [A1])
  return uniq(allWells)
}
export function getChannels(
  pipetteId: string,
  pipetteEntities: PipetteEntities
): PipetteChannels | null | undefined {
  const pipette: any | null | undefined = pipetteEntities[pipetteId]

  if (!pipette) {
    return null
  }

  return pipette.spec.channels
}
export const DISPOSAL_VOL_DIGITS = 1
export function getMaxDisposalVolumeForMultidispense(
  values: {
    aspirate_airGap_checkbox?: boolean | null
    aspirate_airGap_volume?: string | null
    path: PathOption
    pipette: string | null
    volume: string | null
    tipRack?: string | null
  },
  pipetteEntities: PipetteEntities
): number | null | undefined {
  // calculate max disposal volume for given volume & pipette. Might be negative!
  const pipetteId = values?.pipette
  if (!values || !pipetteId) return null
  console.assert(
    values.path === 'multiDispense',
    `getMaxDisposalVolumeForMultidispense expected multiDispense, got path ${values.path}`
  )
  const pipetteEntity = pipetteEntities[pipetteId]
  const pipetteCapacity = getPipetteCapacity(pipetteEntity, values.tipRack)
  const volume = Number(values.volume)
  const airGapChecked = values.aspirate_airGap_checkbox
  let airGapVolume = airGapChecked ? Number(values.aspirate_airGap_volume) : 0
  airGapVolume = Number.isFinite(airGapVolume) ? airGapVolume : 0
  return round(pipetteCapacity - volume * 2 - airGapVolume, DISPOSAL_VOL_DIGITS)
}
// Ensures that 2x volume can fit in pipette
// NOTE: ensuring that disposalVolume_volume will not exceed pipette capacity
// is responsibility of dependentFieldsUpdateMoveLiquid's clamp fn
export function volumeInCapacityForMulti(
  rawForm: FormData,
  pipetteEntities: PipetteEntities
): boolean {
  console.assert(
    rawForm.pipette in pipetteEntities,
    `volumeInCapacityForMulti expected pipette ${rawForm.pipette} to be in pipetteEntities`
  )
  const pipetteEntity = pipetteEntities[rawForm.pipette]
  const pipetteCapacity =
    pipetteEntity &&
    getPipetteCapacity(pipetteEntity, rawForm.tipRack as string)
  const volume = Number(rawForm.volume)
  const airGapChecked = rawForm.aspirate_airGap_checkbox
  let airGapVolume = airGapChecked ? Number(rawForm.aspirate_airGap_volume) : 0
  airGapVolume = Number.isFinite(airGapVolume) ? airGapVolume : 0
  return rawForm.path === 'multiAspirate'
    ? volumeInCapacityForMultiAspirate({
        volume,
        pipetteCapacity,
        airGapVolume,
      })
    : volumeInCapacityForMultiDispense({
        volume,
        pipetteCapacity,
        airGapVolume,
      })
}
export function volumeInCapacityForMultiAspirate(args: {
  volume: number
  pipetteCapacity: number
  airGapVolume: number
}): boolean {
  const { volume, pipetteCapacity, airGapVolume } = args
  return (
    volume > 0 &&
    pipetteCapacity > 0 &&
    volume * 2 + airGapVolume * 2 <= pipetteCapacity
  )
}
export function volumeInCapacityForMultiDispense(args: {
  volume: number
  pipetteCapacity: number
  airGapVolume: number
}): boolean {
  const { volume, pipetteCapacity, airGapVolume } = args

  return (
    volume > 0 &&
    pipetteCapacity > 0 &&
    volume * 2 + airGapVolume <= pipetteCapacity
  )
}
interface GetDefaultWellsArgs {
  labwareId: string | null | undefined
  pipetteId: string | null | undefined
  labwareEntities: LabwareEntities
  pipetteEntities: PipetteEntities
}
export function getDefaultWells(args: GetDefaultWellsArgs): string[] {
  const { labwareId, pipetteId, labwareEntities, pipetteEntities } = args
  if (
    !labwareId ||
    !labwareEntities[labwareId] ||
    !pipetteId ||
    !pipetteEntities[pipetteId]
  )
    return []
  const labwareDef = labwareEntities[labwareId].def
  const pipetteCanUseLabware = canPipetteUseLabware(
    pipetteEntities[pipetteId].spec,
    labwareDef
  )
  if (!pipetteCanUseLabware) return []
  const isSingleWellLabware =
    labwareDef.ordering.length === 1 && labwareDef.ordering[0].length === 1

  if (isSingleWellLabware) {
    const well = labwareDef.ordering[0][0]
    console.assert(
      well === 'A1',
      `sanity check: expected single-well labware ${labwareId} to have only the well 'A1'`
    )
    return [well]
  }

  return []
}
export function fieldHasChanged(
  rawForm: FormData,
  patch: FormPatch,
  fieldName: StepFieldName
): boolean {
  return Boolean(
    patch[fieldName] !== undefined && patch[fieldName] !== rawForm[fieldName]
  )
}
