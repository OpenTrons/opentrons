import { describe, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/protocol-designer/__testing-utils__'

import { SingleStepMoveLiquidTools } from '../SingleStepMoveLiquidTools'
import { MultipleStepsMoveLiquidTools } from '../MultipleStepsMoveLiquidTools'

import { MoveLiquidTools } from '../'

import type { ComponentProps } from 'react'
import type { FieldPropsByName } from '/protocol-designer/pages/Designer/ProtocolSteps/StepForm/types'
import type { FormData } from '/protocol-designer/form-types'
import type { StepFormErrors } from '/protocol-designer/steplist'

vi.mock('../SingleStepMoveLiquidTools')
vi.mock('../MultipleStepsMoveLiquidTools')

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

    vi.mocked(SingleStepMoveLiquidTools).mockReturnValue(
      <div>mock SingleStepMoveLiquidTools</div>
    )
    vi.mocked(MultipleStepsMoveLiquidTools).mockReturnValue(
      <div>mock MultipleStepsMoveLiquidTools</div>
    )
  })

  it('renders SingleStepMoveLiquidTools when there is only one step', () => {
    render(props)
    screen.getByText('mock SingleStepMoveLiquidTools')
  })

  it('renders MultipleStepsMoveLiquidTools when there are multiple steps', () => {
    props.toolboxStep = 3
    render(props)
    screen.getByText('mock MultipleStepsMoveLiquidTools')
  })
})
