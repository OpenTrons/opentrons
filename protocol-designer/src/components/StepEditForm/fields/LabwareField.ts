import * as React from 'react'
import { connect } from 'react-redux'
import { selectors as uiLabwareSelectors } from '../../../ui/labware'
import { StepFormDropdownProps } from './StepFormDropdownField'
import { StepFormDropdown } from './StepFormDropdownField'
import { Options } from '@opentrons/components'
import { StepFieldName } from '../../../steplist/fieldLevel'
import { BaseState } from '../../../types'
import { FieldProps } from '../types'
type OP = FieldProps & {
  name: StepFieldName
  className?: string
}
type SP = {
  options: Options
}

const mapSTP = (state: BaseState): SP => ({
  options: uiLabwareSelectors.getLabwareOptions(state),
})

export const LabwareField: React.AbstractComponent<OP> = connect<
  StepFormDropdownProps,
  OP,
  SP,
  _,
  _,
  _
>(mapSTP)(StepFormDropdown)
