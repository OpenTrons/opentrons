import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { OffsetTag } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/OffsetTag'
import { Tag } from '@opentrons/components'

vi.mock('@opentrons/components', () => ({
  Tag: vi.fn(({ iconName, type, iconPosition, text }) => (
    <div
      data-testid="mock-tag"
      data-icon-name={iconName}
      data-type={type}
      data-icon-position={iconPosition}
    >
      {text}
    </div>
  )),
}))

describe('OffsetTag', () => {
  it('renders with "Default" text and reticle icon when kind is default', () => {
    renderWithProviders(<OffsetTag kind="default" />, { i18nInstance: i18n })

    const tagElement = screen.getByTestId('mock-tag')

    expect(tagElement).toHaveTextContent('Default')

    expect(tagElement).toHaveAttribute('data-icon-name', 'reticle')
    expect(tagElement).toHaveAttribute('data-icon-position', 'left')
    expect(tagElement).toHaveAttribute('data-type', 'default')

    expect(Tag).toHaveBeenCalledWith(
      expect.objectContaining({
        iconName: 'reticle',
        type: 'default',
        iconPosition: 'left',
        text: 'Default',
      }),
      expect.anything()
    )
  })

  it('renders with vector values and reticle icon when kind is vector', () => {
    renderWithProviders(
      <OffsetTag kind="vector" x={1.23} y={-0.45} z={0.67} />,
      { i18nInstance: i18n }
    )

    const tagElement = screen.getByTestId('mock-tag')

    expect(tagElement).toHaveTextContent('X 1.2, Y -0.5, Z 0.7')

    expect(tagElement).toHaveAttribute('data-icon-name', 'reticle')
    expect(tagElement).toHaveAttribute('data-icon-position', 'left')
    expect(tagElement).toHaveAttribute('data-type', 'default')

    expect(Tag).toHaveBeenCalledWith(
      expect.objectContaining({
        iconName: 'reticle',
        type: 'default',
        iconPosition: 'left',
        text: 'X 1.2, Y -0.5, Z 0.7',
      }),
      expect.anything()
    )
  })

  it('rounds vector values to 1 decimal place', () => {
    renderWithProviders(
      <OffsetTag kind="vector" x={1.23456} y={-0.45678} z={0.6789} />,
      { i18nInstance: i18n }
    )

    const tagElement = screen.getByTestId('mock-tag')

    expect(tagElement).toHaveTextContent('X 1.2, Y -0.5, Z 0.7')
  })

  it('renders with "No offset data" text and no icon when kind is noOffset', () => {
    renderWithProviders(<OffsetTag kind="noOffset" />, { i18nInstance: i18n })

    const tagElement = screen.getByTestId('mock-tag')

    expect(tagElement).toHaveTextContent('No offset data')
    expect(tagElement).toHaveAttribute('data-icon-position', 'left')
    expect(tagElement).toHaveAttribute('data-type', 'default')

    expect(Tag).toHaveBeenCalledWith(
      expect.objectContaining({
        iconName: undefined,
        type: 'default',
        iconPosition: 'left',
        text: 'No offset data',
      }),
      expect.anything()
    )
  })

  it('renders with "Hardcoded" text and reticle icon kind is hardcoded', () => {
    renderWithProviders(<OffsetTag kind="hardcoded" />, { i18nInstance: i18n })

    const tagElement = screen.getByTestId('mock-tag')

    expect(tagElement).toHaveAttribute('data-icon-name', 'reticle')
    expect(tagElement).toHaveAttribute('data-icon-position', 'left')
    expect(tagElement).toHaveAttribute('data-type', 'default')

    expect(Tag).toHaveBeenCalledWith(
      expect.objectContaining({
        iconName: 'reticle',
        type: 'default',
        iconPosition: 'left',
        text: 'Hardcoded',
      }),
      expect.anything()
    )
  })
})
