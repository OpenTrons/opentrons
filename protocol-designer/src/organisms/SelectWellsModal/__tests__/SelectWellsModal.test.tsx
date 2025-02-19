import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import {
  fixture96Plate,
  fixtureP1000SingleV2Specs,
} from '@opentrons/shared-data'
import { i18n } from '/protocol-designer/assets/localization'
import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { selectors } from '/protocol-designer/labware-ingred/selectors'
import { getAllWellContentsForActiveItem } from '/protocol-designer/top-selectors/well-contents'
import {
  getLabwareEntities,
  getPipetteEntities,
} from '/protocol-designer/step-forms/selectors'
import { SelectableLabware } from '/protocol-designer/organisms/Labware/SelectableLabware'
import { SelectWellsModal } from '..'

import type { ComponentProps } from 'react'
import type { LabwareDefinition2, PipetteName } from '@opentrons/shared-data'

vi.mock('/protocol-designer/step-forms/selectors')
vi.mock('/protocol-designer/labware-ingred/selectors')
vi.mock('/protocol-designer/top-selectors/well-contents')
vi.mock('/protocol-designer/organisms/Labware/SelectableLabware')

const render = (props: ComponentProps<typeof SelectWellsModal>) => {
  return renderWithProviders(<SelectWellsModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const labwareId = 'mockId'
const pipId = 'mockPipId'
describe('SelectWellsModal', () => {
  let props: ComponentProps<typeof SelectWellsModal>

  beforeEach(() => {
    props = {
      isOpen: true,
      name: 'aspirate_wells',
      onCloseClick: vi.fn(),
      value: 2,
      updateValue: vi.fn(),
      labwareId: labwareId,
      pipetteId: pipId,
    }
    vi.mocked(SelectableLabware).mockReturnValue(
      <div>mock SelectableLabware</div>
    )
    vi.mocked(selectors.getLiquidDisplayColors).mockReturnValue([])
    vi.mocked(getAllWellContentsForActiveItem).mockReturnValue({})
    vi.mocked(selectors.getLiquidNamesById).mockReturnValue({})
    vi.mocked(getLabwareEntities).mockReturnValue({
      labwareId: {
        id: labwareId,
        labwareDefURI: 'mockUri',
        def: fixture96Plate as LabwareDefinition2,
        pythonName: 'mockPythonName',
      },
    })
    vi.mocked(getPipetteEntities).mockReturnValue({
      pipId: {
        spec: fixtureP1000SingleV2Specs,
        tiprackLabwareDef: [],
        name: fixtureP1000SingleV2Specs.displayName as PipetteName,
        id: pipId,
        tiprackDefURI: [],
        pythonName: 'mockPythonName',
      },
    })
  })
  it('renders a labware and the modal title, buttons should call ctas', () => {
    render(props)
    screen.getByText('Select source wells using a')
    screen.getByText('Click and drag to select wells')
    fireEvent.click(screen.getByText('Back'))
    expect(props.onCloseClick).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Save'))
    expect(props.updateValue).toHaveBeenCalled()
    expect(props.onCloseClick).toHaveBeenCalled()
  })
})
