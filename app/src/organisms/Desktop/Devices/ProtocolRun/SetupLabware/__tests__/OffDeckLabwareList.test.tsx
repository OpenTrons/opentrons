import { MemoryRouter } from 'react-router-dom'
import { screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { LabwareListItem } from '../LabwareListItem'
import { OffDeckLabwareList } from '../OffDeckLabwareList'

import type { ComponentProps } from 'react'

vi.mock('../LabwareListItem')

const render = (props: ComponentProps<typeof OffDeckLabwareList>) => {
  return renderWithProviders(
    <MemoryRouter>
      <OffDeckLabwareList {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('OffDeckLabwareList', () => {
  beforeEach(() => {
    vi.mocked(LabwareListItem).mockReturnValue(
      <div>mock labware list item</div>
    )
  })
  it('renders null if labware items is null', () => {
    render({
      labwareItems: [],
      isFlex: false,
      setSelectedStack: vi.fn(),
    })
    expect(screen.queryAllByText('Additional Off-Deck Labware')).toHaveLength(0)
  })
  it('renders additional offdeck labware info if there is an offdeck labware', () => {
    render({
      labwareItems: [
        {
          displayName: 'nickName',
          definitionUri: 'mock def uri',
          labwareId: '1234',
        },
      ],
      isFlex: false,
      setSelectedStack: vi.fn(),
    })
    screen.getByText('Additional Off-Deck Labware')
    screen.getByText('mock labware list item')
  })
})
