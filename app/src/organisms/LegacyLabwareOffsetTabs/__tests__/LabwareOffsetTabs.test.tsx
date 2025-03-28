import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { LegacyLabwareOffsetTabs } from '..'

const mockTableComponent = <div>Table Component</div>
const mockJupyterComponent = <div>Jupyter Component</div>
const mockCLIComponent = <div>CLI Component</div>

const render = () => {
  return renderWithProviders(
    <LegacyLabwareOffsetTabs
      TableComponent={mockTableComponent}
      JupyterComponent={mockJupyterComponent}
      CommandLineComponent={mockCLIComponent}
    />,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('LabwareOffsetTabs', () => {
  it('renders the TableComponent by default', () => {
    render()
    expect(screen.getByText('Table Component')).toBeVisible()
  })

  it('renders the JupyterComponent when Juypter Notebook tab is clicked', () => {
    render()
    fireEvent.click(screen.getByText('Jupyter Notebook'))
    expect(screen.getByText('Jupyter Component')).toBeVisible()
  })

  it('renders the CommandLineComponent when Command Line Interface tab is clicked', () => {
    render()
    fireEvent.click(screen.getByText('Command Line Interface (SSH)'))
    expect(screen.getByText('CLI Component')).toBeVisible()
  })
})
