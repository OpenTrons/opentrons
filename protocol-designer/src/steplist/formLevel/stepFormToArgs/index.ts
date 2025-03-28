import mapValues from 'lodash/mapValues'
import { castField } from '../../../steplist/fieldLevel'
import { mixFormToArgs } from './mixFormToArgs'
import { pauseFormToArgs } from './pauseFormToArgs'
import { magnetFormToArgs } from './magnetFormToArgs'
import { temperatureFormToArgs } from './temperatureFormToArgs'
import { thermocyclerFormToArgs } from './thermocyclerFormToArgs'
import { heaterShakerFormToArgs } from './heaterShakerFormToArgs'
import { moveLiquidFormToArgs } from './moveLiquidFormToArgs'
import { moveLabwareFormToArgs } from './moveLabwareFormToArgs'
import { commentFormToArgs } from './commentFormToArgs'
import { absorbanceReaderFormToArgs } from './absorbanceReaderFormToArgs'
import type { CommandCreatorArgs } from '@opentrons/step-generation'
import type {
  HydratedAbsorbanceReaderFormData,
  HydratedCommentFormData,
  HydratedHeaterShakerFormData,
  HydratedMagnetFormData,
  HydratedMixFormData,
  HydratedMoveLabwareFormData,
  HydratedMoveLiquidFormData,
  HydratedTemperatureFormData,
  HydratedPauseFormData,
  HydratedThermocyclerFormData,
  HydratedFormData,
} from '../../../form-types'
// NOTE: this acts as an adapter for the PD defined data shape of the step forms
// to create arguments that the step generation service is expecting
// in order to generate command creators
type StepArgs = CommandCreatorArgs | null
export const _castForm = (hydratedForm: HydratedFormData): any =>
  mapValues(hydratedForm, (value, name) => castField(name, value))

export const stepFormToArgs = (hydratedForm: HydratedFormData): StepArgs => {
  const castForm = _castForm(hydratedForm)
  switch (castForm.stepType) {
    case 'moveLiquid': {
      return moveLiquidFormToArgs(castForm as HydratedMoveLiquidFormData)
    }

    case 'pause':
      return pauseFormToArgs(castForm as HydratedPauseFormData)

    case 'mix':
      return mixFormToArgs(castForm as HydratedMixFormData)

    case 'magnet':
      return magnetFormToArgs(castForm as HydratedMagnetFormData)

    case 'temperature':
      return temperatureFormToArgs(castForm as HydratedTemperatureFormData)

    case 'thermocycler':
      return thermocyclerFormToArgs(castForm as HydratedThermocyclerFormData)

    case 'heaterShaker':
      return heaterShakerFormToArgs(castForm as HydratedHeaterShakerFormData)

    case 'moveLabware': {
      return moveLabwareFormToArgs(castForm as HydratedMoveLabwareFormData)
    }

    case 'comment': {
      return commentFormToArgs(castForm as HydratedCommentFormData)
    }

    case 'absorbanceReader': {
      return absorbanceReaderFormToArgs(
        castForm as HydratedAbsorbanceReaderFormData
      )
    }

    default:
      console.warn(`stepFormToArgs not implemented for ${castForm.stepType}`)
      return null
  }
}
