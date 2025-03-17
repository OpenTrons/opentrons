import { describe, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { getEnableLiquidClasses } from '../../../../../../../feature-flags/selectors'
import { getLiquidEntities } from '../../../../../../../step-forms/selectors'
import { renderWithProviders } from '../../../../../../../__testing-utils__'

import { FirstStepMoveLiquidTools } from '../FirstStepMoveLiquidTools'
import { SecondStepsMoveLiquidTools } from '../SecondStepsMoveLiquidTools'
import { LiquidClassesStepTools } from '../LiquidClassesStepTools'

import { MoveLiquidTools } from '../'

import type { ComponentProps } from 'react'
import type { FieldPropsByName } from '../../../types'
import type { FormData } from '../../../../../../../form-types'
import type { StepFormErrors } from '../../../../../../../steplist'

vi.mock('../../../../../../../feature-flags/selectors')
vi.mock('../../../../../../../step-forms/selectors')
vi.mock('../FirstStepMoveLiquidTools')
vi.mock('../SecondStepsMoveLiquidTools')
vi.mock('../LiquidClassesStepTools')

const render = (props: ComponentProps<typeof MoveLiquidTools>) => {
  return renderWithProviders(<MoveLiquidTools {...props} />)
}

describe('MoveLiquidTools', () => {
  let props: ComponentProps<typeof MoveLiquidTools>

  beforeEach(() => {
    props = {
      toolboxStep: 0,
      propsForFields: {} as FieldPropsByName,
      formData: {} as FormData,
      visibleFormErrors: {} as StepFormErrors,
      tab: 'aspirate',
      setTab: vi.fn(),
      focusHandlers: {} as any,
      showFormErrors: false,
    }
    vi.mocked(getEnableLiquidClasses).mockReturnValue(false)
    vi.mocked(getLiquidEntities).mockReturnValue({})

    vi.mocked(FirstStepMoveLiquidTools).mockReturnValue(
      <div>mock FirstStepMoveLiquidTools</div>
    )
    vi.mocked(LiquidClassesStepTools).mockReturnValue(
      <div>mock LiquidClassesStepMoveLiquidTools</div>
    )
    vi.mocked(SecondStepsMoveLiquidTools).mockReturnValue(
      <div>mock SecondStepsMoveLiquidTools</div>
    )
  })

  it('renders SingleStepMoveLiquidTools when there is only one step', () => {
    render(props)
    screen.getByText('mock FirstStepMoveLiquidTools')
  })

  it('renders MultipleStepsMoveLiquidTools when there are multiple steps', () => {
    props.toolboxStep = 1
    render(props)
    screen.getByText('mock SecondStepsMoveLiquidTools')
  })

  it('renders LiquidClassesStepMoveLiquidTools when feature flag is on', () => {
    vi.mocked(getEnableLiquidClasses).mockReturnValue(true)
    props.toolboxStep = 1
    render(props)
    screen.getByText('mock LiquidClassesStepMoveLiquidTools')
  })
})
