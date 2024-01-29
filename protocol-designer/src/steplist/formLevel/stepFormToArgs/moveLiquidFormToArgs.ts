import assert from 'assert'
import { getWellsDepth, LabwareDefinition2 } from '@opentrons/shared-data'
import { DEST_WELL_BLOWOUT_DESTINATION } from '@opentrons/step-generation'
import {
  DEFAULT_MM_FROM_BOTTOM_ASPIRATE,
  DEFAULT_MM_FROM_BOTTOM_DISPENSE,
  DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP,
  DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP,
} from '../../../constants'
import { getOrderedWells } from '../../utils'
import { getMoveLiquidDelayData } from './getDelayData'
import { HydratedMoveLiquidFormData } from '../../../form-types'
import type {
  ConsolidateArgs,
  DistributeArgs,
  TransferArgs,
  InnerMixArgs,
} from '@opentrons/step-generation'
type MoveLiquidFields = HydratedMoveLiquidFormData['fields']

// NOTE(sa, 2020-08-11): leaving this as fn so it can be expanded later for dispense air gap
export function getAirGapData(
  hydratedFormData: MoveLiquidFields,
  checkboxField: 'aspirate_airGap_checkbox' | 'dispense_airGap_checkbox',
  volumeField: 'aspirate_airGap_volume' | 'dispense_airGap_volume'
): number | null {
  const checkbox = hydratedFormData[checkboxField]
  const volume = hydratedFormData[volumeField]

  if (checkbox && typeof volume === 'number' && volume > 0) {
    return volume
  }

  return null
}
export function getMixData(
  hydratedFormData: any,
  checkboxField: any,
  volumeField: any,
  timesField: any
): InnerMixArgs | null | undefined {
  const checkbox = hydratedFormData[checkboxField]
  const volume = hydratedFormData[volumeField]
  const times = hydratedFormData[timesField]

  if (
    checkbox &&
    typeof volume === 'number' &&
    volume > 0 &&
    typeof times === 'number' &&
    times > 0
  ) {
    return {
      volume,
      times,
    }
  }

  return null
}
type MoveLiquidStepArgs = ConsolidateArgs | DistributeArgs | TransferArgs | null
export const moveLiquidFormToArgs = (
  hydratedFormData: HydratedMoveLiquidFormData
): MoveLiquidStepArgs => {
  assert(
    hydratedFormData.stepType === 'moveLiquid',
    `moveLiquidFormToArgs called with stepType ${hydratedFormData.stepType}, expected "moveLiquid"`
  )
  const fields = hydratedFormData.fields
  const pipetteSpec = fields.pipette.spec
  const pipetteId = fields.pipette.id
  const {
    volume,
    aspirate_labware: sourceLabware,
    dispense_labware: destLabware,
    aspirate_wells: sourceWellsUnordered,
    dispense_wells: destWellsUnordered,
    dropTip_location: dropTipLocation,
    path,
    nozzles,
  } = fields
  let sourceWells = getOrderedWells(
    fields.aspirate_wells,
    sourceLabware.def,
    fields.aspirate_wellOrder_first,
    fields.aspirate_wellOrder_second
  )

  const isDispensingIntoDisposalLocation =
    'name' in destLabware &&
    (destLabware.name === 'wasteChute' || destLabware.name === 'trashBin')

  let def: LabwareDefinition2 | null = null
  let dispWells: string[] = []

  if ('def' in destLabware) {
    def = destLabware.def
    dispWells = destWellsUnordered
  }
  let destWells =
    !isDispensingIntoDisposalLocation && def != null
      ? getOrderedWells(
          dispWells,
          def,
          fields.dispense_wellOrder_first,
          fields.dispense_wellOrder_second
        )
      : null

  // 1:many with single path: spread well array of length 1 to match other well array
  // distribute 1:many can not happen into the waste chute or trash bin
  if (destWells != null && !isDispensingIntoDisposalLocation) {
    if (path === 'single' && sourceWells.length !== destWells.length) {
      if (sourceWells.length === 1) {
        sourceWells = Array(destWells.length).fill(sourceWells[0])
      } else if (destWells.length === 1) {
        destWells = Array(sourceWells.length).fill(destWells[0])
      }
    }
  }
  const wellDepth =
    'def' in destLabware && destWells != null
      ? getWellsDepth(destLabware.def, destWells)
      : 0

  const disposalVolume = fields.disposalVolume_checkbox
    ? fields.disposalVolume_volume
    : null
  const touchTipAfterAspirate = Boolean(fields.aspirate_touchTip_checkbox)
  const touchTipAfterAspirateOffsetMmFromBottom =
    fields.aspirate_touchTip_mmFromBottom ||
    getWellsDepth(fields.aspirate_labware.def, sourceWells) +
      DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP
  const touchTipAfterDispense = Boolean(fields.dispense_touchTip_checkbox)
  const touchTipAfterDispenseOffsetMmFromBottom =
    fields.dispense_touchTip_mmFromBottom ||
    wellDepth + DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP
  const mixBeforeAspirate = getMixData(
    fields,
    'aspirate_mix_checkbox',
    'aspirate_mix_volume',
    'aspirate_mix_times'
  )
  const mixInDestination = getMixData(
    fields,
    'dispense_mix_checkbox',
    'dispense_mix_volume',
    'dispense_mix_times'
  )
  const aspirateDelay = getMoveLiquidDelayData(
    fields,
    'aspirate_delay_checkbox',
    'aspirate_delay_seconds',
    'aspirate_delay_mmFromBottom'
  )
  const dispenseDelay = getMoveLiquidDelayData(
    fields,
    'dispense_delay_checkbox',
    'dispense_delay_seconds',
    'dispense_delay_mmFromBottom'
  )
  const blowoutLocation =
    (fields.blowout_checkbox && fields.blowout_location) || null
  const blowoutOffsetFromTopMm = DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP
  const aspirateAirGapVolume = getAirGapData(
    fields,
    'aspirate_airGap_checkbox',
    'aspirate_airGap_volume'
  )
  const dispenseAirGapVolume = getAirGapData(
    fields,
    'dispense_airGap_checkbox',
    'dispense_airGap_volume'
  )
  const commonFields = {
    pipette: pipetteId,
    volume,
    sourceLabware: sourceLabware.id,
    destLabware: destLabware.id,
    aspirateFlowRateUlSec:
      fields.aspirate_flowRate || pipetteSpec.defaultAspirateFlowRate.value,
    dispenseFlowRateUlSec:
      fields.dispense_flowRate || pipetteSpec.defaultDispenseFlowRate.value,
    aspirateOffsetFromBottomMm:
      fields.aspirate_mmFromBottom || DEFAULT_MM_FROM_BOTTOM_ASPIRATE,
    dispenseOffsetFromBottomMm:
      fields.dispense_mmFromBottom || DEFAULT_MM_FROM_BOTTOM_DISPENSE,
    blowoutFlowRateUlSec:
      fields.dispense_flowRate || pipetteSpec.defaultBlowOutFlowRate.value,
    blowoutOffsetFromTopMm,
    changeTip: fields.changeTip,
    preWetTip: Boolean(fields.preWetTip),
    aspirateDelay,
    dispenseDelay,
    aspirateAirGapVolume,
    dispenseAirGapVolume,
    touchTipAfterAspirate,
    touchTipAfterAspirateOffsetMmFromBottom,
    touchTipAfterDispense,
    touchTipAfterDispenseOffsetMmFromBottom,
    description: hydratedFormData.description,
    name: hydratedFormData.stepName,
    dropTipLocation,
    nozzles,
  }
  assert(
    sourceWellsUnordered.length > 0,
    'expected sourceWells to have length > 0'
  )
  assert(
    !(
      path === 'multiDispense' &&
      blowoutLocation === DEST_WELL_BLOWOUT_DESTINATION
    ),
    'blowout location for multiDispense cannot be destination well'
  )

  if (!isDispensingIntoDisposalLocation && dispWells.length === 0) {
    console.error('expected to have destWells.length > 0 but got none')
  }

  assert(
    !(path === 'multiDispense' && destWells == null),
    'cannot distribute when destWells is null'
  )

  switch (path) {
    case 'single': {
      const transferStepArguments: TransferArgs = {
        ...commonFields,
        commandCreatorFnName: 'transfer',
        blowoutLocation,
        sourceWells,
        destWells,
        mixBeforeAspirate,
        mixInDestination,
      }
      return transferStepArguments
    }

    case 'multiAspirate': {
      const consolidateStepArguments: ConsolidateArgs = {
        ...commonFields,
        commandCreatorFnName: 'consolidate',
        blowoutLocation,
        mixFirstAspirate: mixBeforeAspirate,
        mixInDestination,
        sourceWells,
        destWell: destWells != null ? destWells[0] : null,
      }
      return consolidateStepArguments
    }

    case 'multiDispense': {
      const distributeStepArguments: DistributeArgs = {
        ...commonFields,
        commandCreatorFnName: 'distribute',
        disposalVolume,
        // distribute needs blowout location field because disposal volume checkbox might be checked without blowout checkbox being checked
        blowoutLocation: fields.blowout_location,
        mixBeforeAspirate,
        sourceWell: sourceWells[0],
        // cannot distribute into a waste chute so if destWells is null
        // there is an error
        destWells: destWells ?? [],
      }
      return distributeStepArguments
    }

    default: {
      assert(
        false,
        `moveLiquidFormToArgs got unexpected "path" field value: ${path}`
      )
      return null
    }
  }
}
