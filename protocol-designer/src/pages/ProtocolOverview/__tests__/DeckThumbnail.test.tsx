import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { screen } from '@testing-library/react'
import {
  FLEX_ROBOT_TYPE,
  fixture12Trough,
  OT2_ROBOT_TYPE,
} from '@opentrons/shared-data'
import { renderWithProviders } from '../../../__testing-utils__'
import { getInitialDeckSetup } from '../../../step-forms/selectors'
import { LabwareOnDeck } from '../../../components/organisms'
import { DeckThumbnail } from '../DeckThumbnail'

import type { ComponentProps } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type * as Components from '@opentrons/components'

vi.mock('../../../components/organisms')
vi.mock('../../../file-data/selectors')
vi.mock('../../../step-forms/selectors')
vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof Components>()
  return {
    ...actual,
    SingleSlotFixture: () => <div>mock single slot fixture</div>,
    Module: () => <div>mock module</div>,
    DeckFromLayers: () => <div>mock DeckFromLayers</div>,
  }
})

const render = (props: ComponentProps<typeof DeckThumbnail>) => {
  return renderWithProviders(<DeckThumbnail {...props} />)[0]
}

describe('DeckThumbnail', () => {
  let props: ComponentProps<typeof DeckThumbnail>

  beforeEach(() => {
    props = {
      hoverSlot: null,
      setHoverSlot: vi.fn(),
      robotType: FLEX_ROBOT_TYPE,
    }
    vi.mocked(LabwareOnDeck).mockReturnValue(<div>mock LabwareOnDeck</div>)
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
      labware: {
        labware: {
          id: 'mockId',
          def: fixture12Trough as LabwareDefinition2,
          labwareDefURI: 'mockDefUri',
          slot: 'A1',
          pythonName: 'mockPythonName',
        },
      },
    })
  })

  it('renders a flex deck with a labware and all single slot fixutres', () => {
    render(props)
    screen.getByText('mock LabwareOnDeck')
    expect(screen.getAllByText('mock single slot fixture')).toHaveLength(12)
  })

  it('renders a ot-2 deck ', () => {
    props = { ...props, robotType: OT2_ROBOT_TYPE }
    render(props)
    screen.getByText('mock DeckFromLayers')
  })
})
