import { describe, it, vi, beforeEach, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { getDeckSetupForActiveItem } from '../../../top-selectors/labware-locations'
import { selectors } from '../../../labware-ingred/selectors'
import { getDesignerTab, getFileMetadata } from '../../../file-data/selectors'
import { generateNewProtocol } from '../../../labware-ingred/actions'
import { Designer } from '../index'
import { LiquidsOverflowMenu } from '../LiquidsOverflowMenu'
import { ProtocolSteps } from '../ProtocolSteps'
import { ProtocolStartingDeck } from '../../../components/organisms/ProtocolStartingDeck'

import type { NavigateFunction } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('../OffDeck')
vi.mock('../ProtocolSteps')
vi.mock('../../../labware-ingred/actions')
vi.mock('../../../labware-ingred/selectors')
vi.mock('../LiquidsOverflowMenu')
vi.mock('../DeckSetup')
vi.mock('../../../file-data/selectors')
vi.mock('../../../top-selectors/labware-locations')
vi.mock('../../../components/organisms/ProtocolStartingDeck')
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
    vi.mocked(LiquidsOverflowMenu).mockReturnValue(
      <div>mock LiquidsOverflowMenu</div>
    )
    vi.mocked(selectors.getZoomedInSlot).mockReturnValue({
      slot: null,
      cutout: null,
    })
    vi.mocked(ProtocolStartingDeck).mockReturnValue(
      <div>mock ProtocolStartingDeck</div>
    )
  })

  it('renders deck setup container and nav buttons', () => {
    render()
    screen.getByText('mockProtocolName')
    screen.getByText('Edit protocol')
    screen.getByText('Protocol steps')
    screen.getByText('mock ProtocolStartingDeck')
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
