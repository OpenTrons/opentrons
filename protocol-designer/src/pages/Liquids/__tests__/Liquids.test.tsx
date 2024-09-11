import * as React from 'react'

import { describe, it, vi, beforeEach, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { selectors as labwareIngredSelectors } from '../../../labware-ingred/selectors'
import { AssignLiquidsModal, ProtocolMetadataNav } from '../../../organisms'
import { LiquidsOverflowMenu } from '../../Designer/LiquidsOverflowMenu'
import { Liquids } from '..'
import type { NavigateFunction } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('../../Designer/LiquidsOverflowMenu')
vi.mock('../../../organisms')
vi.mock('../../../labware-ingred/selectors')
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
    vi.mocked(ProtocolMetadataNav).mockReturnValue(
      <div>mock ProtocolMetadataNav</div>
    )
    vi.mocked(LiquidsOverflowMenu).mockReturnValue(
      <div>mock LiquidsOverflowMenu</div>
    )
  })
  it('calls navigate when there is no active labware', () => {
    vi.mocked(labwareIngredSelectors.getSelectedLabwareId).mockReturnValue(null)
    render()
    expect(mockNavigate).toHaveBeenCalledWith('/overview')
  })

  it('renders nav and assign liquids modal', () => {
    render()
    screen.getByText('mock ProtocolMetadataNav')
    screen.getByText('mock AssignLiquidsModal')
  })

  it('renders the liquids button overflow menu', () => {
    render()
    fireEvent.click(screen.getByText('Liquids'))
    screen.getByText('mock LiquidsOverflowMenu')
  })
})
