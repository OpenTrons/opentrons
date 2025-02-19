import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { i18n } from '/protocol-designer/assets/localization'
import {
  getFileMetadata,
  getRobotType,
} from '/protocol-designer/file-data/selectors'
import {
  getAdditionalEquipmentEntities,
  getInitialDeckSetup,
  getSavedStepForms,
} from '/protocol-designer/step-forms/selectors'
import { getDismissedHints } from '/protocol-designer/tutorial/selectors'
import { MaterialsListModal } from '/protocol-designer/organisms/MaterialsListModal'
import { selectors as labwareIngredSelectors } from '/protocol-designer/labware-ingred/selectors'
import { ProtocolOverview } from '../index'
import { ProtocolMetadata } from '../ProtocolMetadata'
import { InstrumentsInfo } from '../InstrumentsInfo'
import { LiquidDefinitions } from '../LiquidDefinitions'
import { StepsInfo } from '../StepsInfo'
import { StartingDeck } from '../StartingDeck'

import type { NavigateFunction } from 'react-router-dom'

vi.mock('/protocol-designer/step-forms/selectors')
vi.mock('/protocol-designer/tutorial/selectors')
vi.mock('/protocol-designer/file-data/selectors')
vi.mock('/protocol-designer/organisms/MaterialsListModal')
vi.mock('/protocol-designer/labware-ingred/selectors')
vi.mock('/protocol-designer/load-file/actions')
vi.mock('/protocol-designer/feature-flags/selectors')
vi.mock('/protocol-designer/organisms')
vi.mock('../ProtocolMetadata')
vi.mock('../LiquidDefinitions')
vi.mock('../InstrumentsInfo')
vi.mock('../StepsInfo')
vi.mock('../StartingDeck')

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const render = () => {
  return renderWithProviders(<ProtocolOverview />, {
    i18nInstance: i18n,
  })[0]
}

describe('ProtocolOverview', () => {
  beforeEach(() => {
    vi.mocked(getAdditionalEquipmentEntities).mockReturnValue({})
    vi.mocked(getSavedStepForms).mockReturnValue({
      __INITIAL_DECK_SETUP_STEP__: {} as any,
    })
    vi.mocked(labwareIngredSelectors.allIngredientGroupFields).mockReturnValue(
      {}
    )
    vi.mocked(getDismissedHints).mockReturnValue([])
    vi.mocked(getRobotType).mockReturnValue(FLEX_ROBOT_TYPE)
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      pipettes: {},
      additionalEquipmentOnDeck: {},
      modules: {},
      labware: {},
    })
    vi.mocked(getFileMetadata).mockReturnValue({
      protocolName: 'mockName',
      author: 'mockAuthor',
      description: 'mockDescription',
      created: 123,
    })
    vi.mocked(MaterialsListModal).mockReturnValue(
      <div>mock MaterialsListModal</div>
    )
    vi.mocked(LiquidDefinitions).mockReturnValue(
      <div>mock LiquidDefinitions</div>
    )
    vi.mocked(InstrumentsInfo).mockReturnValue(<div>mock InstrumentsInfo</div>)
    vi.mocked(StepsInfo).mockReturnValue(<div>mock StepsInfo</div>)
    vi.mocked(ProtocolMetadata).mockReturnValue(
      <div>mock ProtocolMetadata</div>
    )
    vi.mocked(StartingDeck).mockReturnValue(<div>mock StartingDeck</div>)
  })

  it('renders each section with text', () => {
    render()
    // buttons
    screen.getByRole('button', { name: 'Edit protocol' })
    screen.getByRole('button', { name: 'Export protocol' })

    //  metadata
    screen.getByText('mockName')
    screen.getByText('mock ProtocolMetadata')

    //  instruments
    screen.getByText('mock InstrumentsInfo')

    //   liquids
    screen.getByText('mock LiquidDefinitions')

    //  steps
    screen.getByText('mock StepsInfo')

    // starting deck
    screen.getByText('mock StartingDeck')
  })

  it('navigates to starting deck state', () => {
    render()
    const button = screen.getByRole('button', { name: 'Edit protocol' })
    fireEvent.click(button)
    expect(mockNavigate).toHaveBeenCalledWith('/designer')
  })
})
