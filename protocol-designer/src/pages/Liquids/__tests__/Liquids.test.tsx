import { describe, it, vi, beforeEach, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { screen } from '@testing-library/react'
import { i18n } from '/protocol-designer/assets/localization'
import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { selectors as labwareIngredSelectors } from '/protocol-designer/labware-ingred/selectors'
import {
  AssignLiquidsModal,
  DesignerNavigation,
} from '/protocol-designer/organisms'
import { LiquidsOverflowMenu } from '/protocol-designer/pages/Designer/LiquidsOverflowMenu'
import { Liquids } from '..'

import type { NavigateFunction } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('/protocol-designer/pages/Designer/LiquidsOverflowMenu')
vi.mock('/protocol-designer/organisms')
vi.mock('/protocol-designer/labware-ingred/selectors')
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <Liquids />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('Liquids', () => {
  beforeEach(() => {
    vi.mocked(labwareIngredSelectors.getSelectedLabwareId).mockReturnValue(
      'mockId'
    )
    vi.mocked(AssignLiquidsModal).mockReturnValue(
      <div>mock AssignLiquidsModal</div>
    )
    vi.mocked(DesignerNavigation).mockReturnValue(
      <div>mock DesignerNavigation</div>
    )
    vi.mocked(LiquidsOverflowMenu).mockReturnValue(
      <div>mock LiquidsOverflowMenu</div>
    )
  })
  it('calls navigate when there is no active labware', () => {
    vi.mocked(labwareIngredSelectors.getSelectedLabwareId).mockReturnValue(null)
    render()
    expect(mockNavigate).toHaveBeenCalledWith('/designer')
  })

  it('renders nav and assign liquids modal', () => {
    render()
    screen.getByText('mock DesignerNavigation')
    screen.getByText('mock AssignLiquidsModal')
  })
})
