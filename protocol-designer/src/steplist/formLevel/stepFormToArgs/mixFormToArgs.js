// @flow
import assert from 'assert'
import { DEFAULT_CHANGE_TIP_OPTION } from '../../../constants'
import { getOrderedWells } from '../../utils'
import type { FormData } from '../../../form-types'
import type { MixArgs } from '../../../step-generation'

type MixStepArgs = MixArgs

const mixFormToArgs = (hydratedFormData: FormData): MixStepArgs => {
  const { labware, pipette } = hydratedFormData
  const touchTip = Boolean(hydratedFormData['mix_touchTip_checkbox'])
  const touchTipMmFromBottom = hydratedFormData['mix_touchTip_mmFromBottom']

  let unorderedWells = hydratedFormData.wells || []
  const orderFirst = hydratedFormData.mix_wellOrder_first
  const orderSecond = hydratedFormData.mix_wellOrder_second

  const orderedWells = getOrderedWells(
    unorderedWells,
    labware.def,
    orderFirst,
    orderSecond
  )

  const volume = hydratedFormData.volume
  const times = hydratedFormData.times

  const aspirateFlowRateUlSec = hydratedFormData['aspirate_flowRate']
  const dispenseFlowRateUlSec = hydratedFormData['dispense_flowRate']

  // NOTE: for mix, there is only one tip offset field,
  // and it applies to both aspirate and dispense
  const aspirateOffsetFromBottomMm = hydratedFormData['mix_mmFromBottom']
  const dispenseOffsetFromBottomMm = hydratedFormData['mix_mmFromBottom']

  // It's radiobutton, so one should always be selected.
  // One changeTip option should always be selected.
  assert(
    hydratedFormData['changeTip'],
    'mixFormToArgs expected non-falsey changeTip option'
  )
  const changeTip = hydratedFormData['changeTip'] || DEFAULT_CHANGE_TIP_OPTION

  const blowoutLocation = hydratedFormData['blowout_checkbox']
    ? hydratedFormData['blowout_location']
    : null

  return {
    commandCreatorFnName: 'mix',
    name: `Mix ${hydratedFormData.id}`, // TODO real name for steps
    description: 'description would be here 2018-03-01', // TODO get from form
    labware: labware.id,
    wells: orderedWells,
    volume,
    times,
    touchTip,
    touchTipMmFromBottom,
    changeTip,
    blowoutLocation,
    pipette: pipette.id,
    aspirateFlowRateUlSec,
    dispenseFlowRateUlSec,
    aspirateOffsetFromBottomMm,
    dispenseOffsetFromBottomMm,
  }
}

export default mixFormToArgs
