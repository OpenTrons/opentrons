import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../../../../../assets/localization'
import { renderWithProviders } from '../../../../../../../__testing-utils__'
import { getLiquidEntities } from '../../../../../../../step-forms/selectors'
import { LiquidClassesStepTools } from '../LiquidClassesStepTools'

import type { ComponentProps } from 'react'

vi.mock('../../../../../../../step-forms/selectors')

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
    }
    vi.mocked(getLiquidEntities).mockReturnValue({})
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
})
