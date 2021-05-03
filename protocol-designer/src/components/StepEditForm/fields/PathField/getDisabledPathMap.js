// @flow
import { i18n } from '../../../../localization'
import { getWellRatio } from '../../../../steplist/utils'
import { getPipetteCapacity } from '../../../../pipettes/pipetteData'
import {
  volumeInCapacityForMultiDispense,
  volumeInCapacityForMultiAspirate,
} from '../../../../steplist/formLevel/handleFormChange/utils'

import type {
  ChangeTipOptions,
  PipetteEntities,
} from '@opentrons/step-generation'
import type { PathOption } from '../../../../form-types'

export type DisabledPathMap = { [PathOption]: string } | null

export type ValuesForPath = {|
  aspirate_airGap_checkbox: ?boolean,
  aspirate_airGap_volume: ?string,
  aspirate_wells: ?Array<string>,
  changeTip: ChangeTipOptions,
  dispense_wells: ?Array<string>,
  pipette: ?string,
  volume: ?string,
|}

export function getDisabledPathMap(
  values: ValuesForPath,
  pipetteEntities: PipetteEntities
): DisabledPathMap {
  const {
    aspirate_airGap_checkbox,
    aspirate_wells,
    changeTip,
    dispense_wells,
    pipette,
  } = values

  if (!pipette) return null

  const wellRatio = getWellRatio(aspirate_wells, dispense_wells)

  let disabledPathMap: { multiAspirate: string, multiAspirate: string } = {}

  // changeTip is lowest priority disable reasoning
  if (changeTip === 'perDest') {
    disabledPathMap = {
      ...disabledPathMap,
      multiDispense: i18n.t(
        'form.step_edit_form.field.path.subtitle.incompatible_with_per_dest'
      ),
    }
  } else if (changeTip === 'perSource') {
    disabledPathMap = {
      ...disabledPathMap,
      multiAspirate: i18n.t(
        'form.step_edit_form.field.path.subtitle.incompatible_with_per_source'
      ),
    }
  }

  // transfer volume overwrites change tip disable reasoning
  const pipetteEntity = pipetteEntities[pipette]
  const pipetteCapacity = pipetteEntity && getPipetteCapacity(pipetteEntity)

  const volume = Number(values.volume)
  const airGapChecked = aspirate_airGap_checkbox
  let airGapVolume = airGapChecked ? Number(values.aspirate_airGap_volume) : 0
  airGapVolume = Number.isFinite(airGapVolume) ? airGapVolume : 0

  const withinCapacityForMultiDispense = volumeInCapacityForMultiDispense({
    volume,
    pipetteCapacity,
    airGapVolume,
  })

  const withinCapacityForMultiAspirate = volumeInCapacityForMultiAspirate({
    volume,
    pipetteCapacity,
    airGapVolume,
  })

  if (!withinCapacityForMultiDispense) {
    disabledPathMap = {
      ...disabledPathMap,
      multiDispense: i18n.t(
        'form.step_edit_form.field.path.subtitle.volume_too_high'
      ),
    }
  }
  if (!withinCapacityForMultiAspirate) {
    disabledPathMap = {
      ...disabledPathMap,
      multiAspirate: i18n.t(
        'form.step_edit_form.field.path.subtitle.volume_too_high'
      ),
    }
  }

  // wellRatio overwrites all other disable reasoning
  if (wellRatio === '1:many') {
    disabledPathMap = {
      ...disabledPathMap,
      multiAspirate: i18n.t(
        'form.step_edit_form.field.path.subtitle.only_many_to_1'
      ),
    }
  } else if (wellRatio === 'many:1') {
    disabledPathMap = {
      ...disabledPathMap,
      multiDispense: i18n.t(
        'form.step_edit_form.field.path.subtitle.only_1_to_many'
      ),
    }
  } else {
    disabledPathMap = {
      ...disabledPathMap,
      multiAspirate: i18n.t(
        'form.step_edit_form.field.path.subtitle.only_many_to_1'
      ),
      multiDispense: i18n.t(
        'form.step_edit_form.field.path.subtitle.only_1_to_many'
      ),
    }
  }

  return disabledPathMap
}
