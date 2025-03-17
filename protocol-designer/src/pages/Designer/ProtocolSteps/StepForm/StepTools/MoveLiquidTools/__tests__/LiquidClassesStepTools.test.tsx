import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { COLORS } from '@opentrons/components'
import { i18n } from '../../../../../../../assets/localization'
import { renderWithProviders } from '../../../../../../../__testing-utils__'
import {
  getLiquidEntities,
  getPipetteEntities,
} from '../../../../../../../step-forms/selectors'
import formDataForSingleStep from '../../../../../../../__fixtures__/formDataForSingleStep.json'
import { LiquidClassesStepTools } from '../LiquidClassesStepTools'

import type { ComponentProps } from 'react'

vi.mock('../../../../../../../step-forms/selectors')

const pipetteId = 'af1e518a-0e00-4270-a22a-ca5b43daff30'

const render = (props: ComponentProps<typeof LiquidClassesStepTools>) => {
  return renderWithProviders(<LiquidClassesStepTools {...props} />, {
    i18nInstance: i18n,
  })
}

describe('LiquidClassesStepMoveLiquidTools', () => {
  let props: ComponentProps<typeof LiquidClassesStepTools>

  beforeEach(() => {
    props = {
      propsForFields: {
        liquidClass: {
          onFieldFocus: vi.fn(),
          onFieldBlur: vi.fn(),
          errorToShow: null,
          disabled: false,
          name: 'liquidClass',
          updateValue: vi.fn(),
          value: null,
        },
      },
      formData: formDataForSingleStep as any,
    }
    vi.mocked(getLiquidEntities).mockReturnValue({})
    vi.mocked(getPipetteEntities).mockReturnValue({
      [pipetteId]: {
        name: 'p50_single_flex',
        spec: {} as any,
        id: pipetteId,
        tiprackLabwareDef: [],
        tiprackDefURI: ['mockDefURI1', 'mockDefURI2'],
        pythonName: 'mockPythonName',
      },
    })
  })

  it('renders fields and buttons', () => {
    render(props)
    screen.getByText('Apply liquid class settings for this transfer')
    screen.getByText("Don't use a liquid class")
    screen.getByText('Aqueous')
    screen.getByText('Deionized water')
    screen.getByText('Viscous')
    screen.getByText('50% glycerol')
    screen.getByText('Volatile')
    screen.getByText('80% ethanol')

    fireEvent.click(
      screen.getByRole('label', { name: 'Aqueous Deionized water' })
    )
    expect(props.propsForFields.liquidClass.updateValue).toHaveBeenCalled()
  })

  it('renders associated liquid in the subtext', () => {
    vi.mocked(getLiquidEntities).mockReturnValue({
      '0': {
        displayColor: 'mockColor',
        displayName: 'mockname',
        liquidClass: 'waterV1',
        description: null,
        pythonName: 'liquid_1',
        liquidGroupId: '0',
      },
    })
    render(props)
    screen.getByText('Assigned to mockname')
  })

  it('renders a disabled liquid classes button', () => {
    props.formData.volume = 5
    render(props)
    const noLiquidClass = screen.getByRole('label', {
      name: "Don't use a liquid class",
    })
    const water = screen.getByRole('label', { name: 'Aqueous Deionized water' })

    expect(noLiquidClass).toHaveStyle(`background-color: ${COLORS.blue50}`)
    expect(water).toHaveStyle(`background-color: ${COLORS.grey35}`)
    fireEvent.click(water)
    expect(props.propsForFields.liquidClass.updateValue).not.toHaveBeenCalled()
  })
})
