import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { ABSORBANCE_READER_V1 } from '@opentrons/shared-data'

import { renderWithProviders } from '../../../../__testing-utils__'
import { AddModuleEmptySelectorButton } from '../AddModuleEmptySelectorButton'

import type { ComponentProps } from 'react'
import type { EmptySelectorButton } from '@opentrons/components'

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof EmptySelectorButton>()
  return {
    ...actual,
    EmptySelectorButton: ({ onClick }: { onClick: () => void }) => (
      <button onClick={onClick}>mock EmptySelectorButton</button>
    ),
    Tooltip: vi.fn(({ children }) => <div>{children}</div>),
  }
})
const mockHandleAddModule = vi.fn()

const render = (props: ComponentProps<typeof AddModuleEmptySelectorButton>) => {
  return renderWithProviders(<AddModuleEmptySelectorButton {...props} />)
}

describe('AddModuleEmptySelectorButton', () => {
  let props: ComponentProps<typeof AddModuleEmptySelectorButton>

  beforeEach(() => {
    props = {
      moduleModel: ABSORBANCE_READER_V1,
      areSlotsAvailable: true,
      hasGripper: true,
      handleAddModule: mockHandleAddModule,
      tooltipText: 'tooltipText',
    }
  })

  it('renders mock emptySelector button', () => {
    render(props)
    screen.getByText('mock EmptySelectorButton')
  })

  it('should call mock handleAddModule when clicked', () => {
    render(props)
    fireEvent.click(screen.getByText('mock EmptySelectorButton'))
    expect(mockHandleAddModule).toHaveBeenCalled()
  })

  it('renders tooltip text', async () => {
    props = { ...props, hasGripper: false }
    render(props)
    fireEvent.mouseOver(screen.getByText('mock EmptySelectorButton'))
    await waitFor(() => {
      screen.getByText('tooltipText')
    })
  })
})
