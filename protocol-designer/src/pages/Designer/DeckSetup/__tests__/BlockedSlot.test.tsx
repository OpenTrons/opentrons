import { describe, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { WasteChute } from '@opentrons/components'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../__testing-utils__'
import { getAdditionalEquipmentEntities } from '../../../../step-forms/selectors'
import { BlockedSlot } from '../Overlays/BlockedSlot'
import { SlotOverlay } from '../Overlays/SlotOverlay'

import type { ComponentProps } from 'react'
import type * as OpentronsComponents from '@opentrons/components'
import { WASTE_CHUTE_CUTOUT } from '@opentrons/shared-data'

vi.mock('../Overlays/SlotOverlay')
vi.mock('@opentrons/step-generation')
vi.mock('../../../../step-forms/selectors')
vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof OpentronsComponents>()
  return {
    ...actual,
    WasteChute: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof BlockedSlot>) => {
  return renderWithProviders(<BlockedSlot {...props} />)[0]
}

describe('BlockedSlot', () => {
  let props: ComponentProps<typeof BlockedSlot>

  beforeEach(() => {
    props = {
      slotId: 'D3',
      slotPosition: [0, 0, 0],
    }
    vi.mocked(getAdditionalEquipmentEntities).mockReturnValue({
      wasteChuteId: {
        name: 'wasteChute',
        id: 'mockWasteChuteId',
        location: WASTE_CHUTE_CUTOUT,
      },
    })
    vi.mocked(SlotOverlay).mockReturnValue(<div>mock SlotOverlay</div>)
    vi.mocked(WasteChute).mockReturnValue(<div>mock WasteChute</div>)
  })
  it('renders a waste chute overlay', () => {
    render(props)
    screen.getByText('mock WasteChute')
  })
  it('renders a slot overlay', () => {
    vi.mocked(getAdditionalEquipmentEntities).mockReturnValue({})

    render(props)
    screen.getByText('mock SlotOverlay')
  })
})
