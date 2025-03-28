import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { i18n } from '../../../../../../../assets/localization'
import { renderWithProviders } from '../../../../../../../__testing-utils__'
import { InitializationSettings } from '../InitializationSettings'
import type { ComponentProps } from 'react'
import type { Initialization } from '@opentrons/step-generation'

// Mocking constants
const INITIALIZATION_SINGLE_NO_REFERENCE: Initialization = {
  mode: 'single',
  wavelengths: [450],
}
const INITIALIZATION_SINGLE_REFERENCE: Initialization = {
  mode: 'single',
  wavelengths: [450],
  referenceWavelength: 600,
}
const INITIALIZATION_MULTI: Initialization = {
  mode: 'multi',
  wavelengths: [450, 600],
}
const INITIALIZATION_MULTI_UNKOWN_COLOR: Initialization = {
  mode: 'multi',
  wavelengths: [450, 700],
}

const render = (props: ComponentProps<typeof InitializationSettings>) => {
  return renderWithProviders(<InitializationSettings {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('InitializationSettings', () => {
  let props: ComponentProps<typeof InitializationSettings>
  it('renders no settings message when initialization is null', () => {
    props = { initialization: null }
    render(props)

    expect(
      screen.getByText('Current initialization settings')
    ).toBeInTheDocument()
    expect(screen.getByText('No settings defined')).toBeInTheDocument()
  })

  it('renders single mode wavelength and its color correctly', () => {
    props = { initialization: INITIALIZATION_SINGLE_NO_REFERENCE }
    render(props)
    expect(
      screen.getByText('Current initialization settings')
    ).toBeInTheDocument()
    expect(screen.getByText('450 nm (Blue)')).toBeInTheDocument()
  })
  it('renders single mode wavelength with reference and their respective colors correctly', () => {
    props = { initialization: INITIALIZATION_SINGLE_REFERENCE }
    render(props)
    expect(
      screen.getByText('Current initialization settings')
    ).toBeInTheDocument()
    expect(screen.getByText('450 nm (Blue)')).toBeInTheDocument()
    expect(
      screen.getByText('600 nm (Orange, reference wavelength)')
    ).toBeInTheDocument()
  })
  it('renders multi mode wavelength and their respective colors correctly', () => {
    props = { initialization: INITIALIZATION_MULTI }
    render(props)
    expect(
      screen.getByText('Current initialization settings')
    ).toBeInTheDocument()
    expect(screen.getByText('450 nm (Blue)')).toBeInTheDocument()
    expect(screen.getByText('600 nm (Orange)')).toBeInTheDocument()
  })
  it('renders multi mode wavelength and their respective colors correctly with unkown color', () => {
    props = { initialization: INITIALIZATION_MULTI_UNKOWN_COLOR }
    render(props)
    expect(
      screen.getByText('Current initialization settings')
    ).toBeInTheDocument()
    expect(screen.getByText('450 nm (Blue)')).toBeInTheDocument()
    expect(screen.getByText('700 nm')).toBeInTheDocument()
  })
})
