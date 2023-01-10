import * as React from 'react'
import { renderWithProviders, COLORS } from '@opentrons/components'

import { ProgressBar } from '..'

const render = (props: React.ComponentProps<typeof ProgressBar>) => {
  return renderWithProviders(<ProgressBar {...props} />)
}

describe('ProgressBar', () => {
  let props: React.ComponentProps<typeof ProgressBar>

  beforeEach(() => {
    props = {
      percentComplete: 0,
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders LinerProgress Bar at 0% width', () => {
    const [{ getByTestId }] = render(props)
    const container = getByTestId('ProgressBar_Container')
    const bar = getByTestId('ProgressBar_Bar')
    expect(container).toHaveStyle(`background: ${String(COLORS.white)}`)
    expect(bar).toHaveStyle('width: 0%')
  })

  it('renders LinerProgress Bar at 50% width', () => {
    props.percentComplete = 50
    const [{ getByTestId }] = render(props)
    const bar = getByTestId('ProgressBar_Bar')
    expect(bar).toHaveStyle(`background: ${String(COLORS.blueEnabled)}`)
    expect(bar).toHaveStyle('width: 50%')
  })

  it('renders LinerProgress Bar at 100% width', () => {
    props.percentComplete = 100
    const [{ getByTestId }] = render(props)
    const bar = getByTestId('ProgressBar_Bar')
    expect(bar).toHaveStyle(`background: ${String(COLORS.blueEnabled)}`)
    expect(bar).toHaveStyle('width: 100%')
  })

  it('renders LinerProgress Bar at 50% + red width', () => {
    props.percentComplete = 50
    props.color = COLORS.errorEnabled
    const [{ getByTestId }] = render(props)
    const bar = getByTestId('ProgressBar_Bar')
    expect(bar).not.toHaveStyle(`background: ${String(COLORS.blueEnabled)}`)
    expect(bar).toHaveStyle(`background: ${String(COLORS.errorEnabled)}`)
    expect(bar).toHaveStyle('width: 50%')
  })
})
