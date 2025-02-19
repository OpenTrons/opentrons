import { describe, it, vi, beforeEach, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '/protocol-designer/assets/localization'
import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { getDeckSetupForActiveItem } from '/protocol-designer/top-selectors/labware-locations'
import { selectors } from '/protocol-designer/labware-ingred/selectors'
import {
  getDesignerTab,
  getFileMetadata,
} from '/protocol-designer/file-data/selectors'
import { generateNewProtocol } from '/protocol-designer/labware-ingred/actions'
import { DeckSetupContainer } from '../DeckSetup'
import { Designer } from '../index'
import { LiquidsOverflowMenu } from '../LiquidsOverflowMenu'
import { ProtocolSteps } from '../ProtocolSteps'

import type { NavigateFunction } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('../OffDeck')
vi.mock('../ProtocolSteps')
vi.mock('/protocol-designer/labware-ingred/actions')
vi.mock('/protocol-designer/labware-ingred/selectors')
vi.mock('../LiquidsOverflowMenu')
vi.mock('../DeckSetup')
vi.mock('/protocol-designer/file-data/selectors')
vi.mock('/protocol-designer/top-selectors/labware-locations')
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
      <Designer />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('Designer', () => {
  beforeEach(() => {
    vi.mocked(getDesignerTab).mockReturnValue('startingDeck')
    vi.mocked(ProtocolSteps).mockReturnValue(<div>mock ProtocolSteps</div>)
    vi.mocked(getFileMetadata).mockReturnValue({
      protocolName: 'mockProtocolName',
      created: 123,
    })
    vi.mocked(selectors.getIsNewProtocol).mockReturnValue(true)
    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      modules: {},
      additionalEquipmentOnDeck: {
        trash: { name: 'trashBin', location: 'cutoutA3', id: 'mockId' },
      },
      labware: {},
      pipettes: {},
    })
    vi.mocked(DeckSetupContainer).mockReturnValue(
      <div>mock DeckSetupContainer</div>
    )
    vi.mocked(LiquidsOverflowMenu).mockReturnValue(
      <div>mock LiquidsOverflowMenu</div>
    )
    vi.mocked(selectors.getZoomedInSlot).mockReturnValue({
      slot: null,
      cutout: null,
    })
  })

  it('renders deck setup container and nav buttons', () => {
    render()
    screen.getByText('mock DeckSetupContainer')
    screen.getByText('mockProtocolName')
    screen.getByText('Edit protocol')
    screen.getByText('Protocol steps')
    screen.getByText('Protocol starting deck')
    screen.getByTestId('water-drop')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(mockNavigate).toHaveBeenCalledWith('/overview')
  })

  it('renders the liquids button overflow menu', () => {
    render()
    fireEvent.click(screen.getByTestId('water-drop'))
    screen.getByText('mock LiquidsOverflowMenu')
  })

  it('calls generateNewProtocol when hardware has been placed for a new protocol', () => {
    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      modules: {},
      additionalEquipmentOnDeck: {
        wasteChute: { name: 'wasteChute', id: 'mockId', location: 'cutoutD3' },
        trashBin: { name: 'trashBin', id: 'mockId', location: 'cutoutA3' },
      },
      labware: {},
      pipettes: {},
    })
    render()
    expect(vi.mocked(generateNewProtocol)).toHaveBeenCalled()
  })

  it('renders the protocol steps page', () => {
    vi.mocked(getDesignerTab).mockReturnValue('protocolSteps')
    render()
    fireEvent.click(screen.getByText('Protocol steps'))
    screen.getByText('mock ProtocolSteps')
  })
})
