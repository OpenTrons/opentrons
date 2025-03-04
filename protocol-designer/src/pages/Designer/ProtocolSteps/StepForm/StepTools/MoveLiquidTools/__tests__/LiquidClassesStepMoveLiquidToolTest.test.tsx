import { describe, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { i18n } from '../../../../../../../assets/localization'
import { renderWithProviders } from '../../../../../../../__testing-utils__'
import { getLiquidEntities } from '../../../../../../../step-forms/selectors'

import propsForFieldsForSingleStep from '../../../../../../../__fixtures__/propsForFieldsForSingleStep.json'

import { LiquidClassesStepMoveLiquidTools } from '../LiquidClassesStepMoveLiquidTools'

import type { ComponentProps } from 'react'

vi.mock('../../../../../../../step-forms/selectors')

const render = (
  props: ComponentProps<typeof LiquidClassesStepMoveLiquidTools>
) => {
  return renderWithProviders(<LiquidClassesStepMoveLiquidTools {...props} />, {
    i18nInstance: i18n,
  })
}

describe('LiquidClassesStepMoveLiquidTools', () => {
  let props: ComponentProps<typeof LiquidClassesStepMoveLiquidTools>

  beforeEach(() => {
    props = {
      propsForFields: propsForFieldsForSingleStep as any,
    }
    vi.mocked(getLiquidEntities).mockReturnValue({})
  })

  it('renders fields', () => {
    render(props)
    screen.getByText('Apply liquid class settings for this transfer')
    screen.getByText("Don't use a liquid class")
    screen.getByText('Aqueous')
    screen.getByText('Deionized water')
    screen.getByText('Viscous')
    screen.getByText('50% glycerol')
    screen.getByText('Volatile')
    screen.getByText('80% ethanol')
  })
})
