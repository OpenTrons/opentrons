import { describe, it, beforeEach, vi, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { OT2_ROBOT_TYPE, FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { renderWithProviders } from '../../../../__testing-utils__'
import { SlotDetailsContainer } from '../../../../components/organisms'
import { HoverSlotDetailsContainer } from '../HoverSlotDetailsContainer'

import type { ComponentProps } from 'react'

vi.mock('../../../../components/organisms')

const render = (props: ComponentProps<typeof HoverSlotDetailsContainer>) => {
  return renderWithProviders(<HoverSlotDetailsContainer {...props} />)
}

describe('HoverSlotDetailsContainer', () => {
  let props: ComponentProps<typeof HoverSlotDetailsContainer>

  beforeEach(() => {
    props = {
      hoverSlot: 'A1',
      robotType: FLEX_ROBOT_TYPE,
    }
    vi.mocked(SlotDetailsContainer).mockReturnValue(
      <div>mock SlotDetailsContainer</div>
    )
  })

  it('should render the slot details container for slot A1', () => {
    render(props)
    expect(screen.getByTestId('hover-slot-details-container')).toHaveStyle(
      'left: -20%'
    )
    expect(screen.getByTestId('hover-slot-details-container')).toHaveStyle(
      'right: auto'
    )
    screen.getByText('mock SlotDetailsContainer')
  })

  it('should render the slot details container for slot A3', () => {
    props = {
      hoverSlot: 'A3',
      robotType: FLEX_ROBOT_TYPE,
    }
    render(props)
    expect(screen.getByTestId('hover-slot-details-container')).toHaveStyle(
      'left: auto'
    )
    expect(screen.getByTestId('hover-slot-details-container')).toHaveStyle(
      'right: -20%'
    )
  })

  it('should render the slot details container for slot 1 on OT2', () => {
    props = {
      hoverSlot: '1',
      robotType: OT2_ROBOT_TYPE,
    }
    render(props)
    expect(screen.getByTestId('hover-slot-details-container')).toHaveStyle(
      'left: -15%'
    )
    expect(screen.getByTestId('hover-slot-details-container')).toHaveStyle(
      'right: auto'
    )
    screen.getByText('mock SlotDetailsContainer')
  })

  it('should render the slot details container for slot 6 on OT2', () => {
    props = {
      hoverSlot: '6',
      robotType: OT2_ROBOT_TYPE,
    }
    render(props)
    expect(screen.getByTestId('hover-slot-details-container')).toHaveStyle(
      'left: auto'
    )
    expect(screen.getByTestId('hover-slot-details-container')).toHaveStyle(
      'right: -15%'
    )
  })
})
