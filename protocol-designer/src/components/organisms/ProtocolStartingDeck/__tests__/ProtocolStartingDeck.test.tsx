import { describe, it, beforeEach, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../__testing-utils__'
import { OffDeck } from '../../OffDeck'
import { StartingDeckContainer } from '../StartingDeckContainer'

import { ProtocolStartingDeck } from '../'

import type { ComponentProps } from 'react'

vi.mock('../../OffDeck')
vi.mock('../StartingDeckContainer')

const render = (props: ComponentProps<typeof ProtocolStartingDeck>) => {
  return renderWithProviders(<ProtocolStartingDeck {...props} />)
}

describe('ProtocolStartingDeck', () => {
  let props: ComponentProps<typeof ProtocolStartingDeck>

  beforeEach(() => {
    props = {
      zoomIn: {
        slot: null,
        cutout: null,
      },
    }
    vi.mocked(OffDeck).mockReturnValue(<div>mock OffDeck</div>)
    vi.mocked(StartingDeckContainer).mockReturnValue(
      <div>mock StartingDeckContainer</div>
    )
  })

  it('should render mock starting deck container and toggle group', () => {
    render(props)
    screen.getByText('mock StartingDeckContainer')
    screen.getByRole('button', { name: 'On deck' })
    screen.getByRole('button', { name: 'Off deck' })
  })

  it('should render mock off deck when clicking off deck', () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Off deck' }))
    screen.getByText('mock OffDeck')
  })
})
