import { describe, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import { FlexTrash } from '@opentrons/components'

import { renderWithProviders } from '../../../../__testing-utils__'
import { selectors } from '../../../../labware-ingred/selectors'
import { getDeckSetupForActiveItem } from '../../../../top-selectors/labware-locations'
import { getRobotType } from '../../../../file-data/selectors'
import { DeckSetupDetails } from '../../DeckSetup/DeckSetupDetails'
import { getDisableModuleRestrictions } from '../../../../feature-flags/selectors'

import { ProtocolStepsDeckContainer } from '../ProtocolStepsDeckContainer'

vi.mock('../../../../top-selectors/labware-locations')
vi.mock('../../../../feature-flags/selectors')
vi.mock('../../../../labware-ingred/selectors')
vi.mock('../../../../file-data/selectors')
vi.mock('../../DeckSetup/DeckSetupDetails')

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof FlexTrash>()
  return {
    ...actual,
    FlexTrash: vi.fn(),
    DeckFromLayers: () => <div>mock DeckFromLayers</div>,
  }
})

const render = () => {
  return renderWithProviders(<ProtocolStepsDeckContainer />)
}

describe('ProtocolStepsDeckContainer', () => {
  beforeEach(() => {
    vi.mocked(selectors.getZoomedInSlot).mockReturnValue({
      slot: 'D3',
      cutout: 'cutoutD3',
    })
    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      labware: {},
      modules: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
    })
    vi.mocked(getRobotType).mockReturnValue(FLEX_ROBOT_TYPE)
    vi.mocked(getDisableModuleRestrictions).mockReturnValue(false)
    vi.mocked(DeckSetupDetails).mockReturnValue(
      <div>mock DeckSetupDetails</div>
    )
    vi.mocked(FlexTrash).mockReturnValue(<div>mock FlexTrash</div>)
  })

  it('renders no deckSetupTools when slot and cutout are null', () => {
    vi.mocked(selectors.getZoomedInSlot).mockReturnValue({
      slot: null,
      cutout: null,
    })
    render()
    screen.getByText('mock DeckSetupDetails')
  })

  it('renders a flex trash when a trash bin is attached', () => {
    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      labware: {},
      modules: {},
      additionalEquipmentOnDeck: {
        trash: { name: 'trashBin', location: 'cutoutA3', id: 'mockId' },
      },
      pipettes: {},
    })
    render()
    screen.getByText('mock FlexTrash')
  })

  it('shouuld render mock DeckFromLayers when robot type is OT-2', () => {
    vi.mocked(getRobotType).mockReturnValue(OT2_ROBOT_TYPE)
    render()
    screen.getByText('mock DeckFromLayers')
  })
})
