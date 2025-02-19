import { describe, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { fixture96Plate } from '@opentrons/shared-data'

import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { i18n } from '/protocol-designer/assets/localization'
import {
  getAdditionalEquipmentEntities,
  getLabwareEntities,
  getPipetteEntities,
} from '/protocol-designer/step-forms/selectors'
import {
  PipetteField,
  TiprackField,
  LabwareField,
  WellSelectionField,
  VolumeField,
  PathField,
  ChangeTipField,
  DropTipField,
  PickUpTipField,
  TipWellSelectionField,
} from '/protocol-designer/pages/Designer/ProtocolSteps/StepForm/PipetteFields'
import { getEnableReturnTip } from '/protocol-designer/feature-flags/selectors'
import propsForFieldsForSingleStep from '/protocol-designer/__fixtures__/propsForFieldsForSingleStep.json'
import formDataForSingleStep from '/protocol-designer/__fixtures__/formDataForSingleStep.json'
import { SingleStepMoveLiquidTools } from '../SingleStepMoveLiquidTools'

import type { ComponentProps } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

vi.mock('/protocol-designer/step-forms/selectors')
vi.mock(
  '/protocol-designer/pages/Designer/ProtocolSteps/StepForm/PipetteFields'
)
vi.mock('/protocol-designer/feature-flags/selectors')

const labwareId = 'mockLabwareId'
const pipetteId = 'mockPipetteId'

const render = (props: ComponentProps<typeof SingleStepMoveLiquidTools>) => {
  return renderWithProviders(<SingleStepMoveLiquidTools {...props} />, {
    i18nInstance: i18n,
  })
}

describe('SingleStepMoveLiquidTools', () => {
  let props: ComponentProps<typeof SingleStepMoveLiquidTools>
  beforeEach(() => {
    props = {
      propsForFields: propsForFieldsForSingleStep as any,
      formData: formDataForSingleStep as any,
      visibleFormErrors: [] as any,
    }

    vi.mocked(getLabwareEntities).mockReturnValue({
      labwareId: {
        id: labwareId,
        labwareDefURI: 'mockUri',
        def: fixture96Plate as LabwareDefinition2,
        pythonName: 'mockPythonName',
      },
    })

    vi.mocked(getPipetteEntities).mockReturnValue({
      [pipetteId]: {
        name: 'p50_single_flex',
        spec: {} as any,
        id: pipetteId,
        tiprackLabwareDef: [],
        tiprackDefURI: ['mockDefURI1', 'mockDefURI2'],
        pythonName: 'mockPythonName',
      },
    })
    vi.mocked(getAdditionalEquipmentEntities).mockReturnValue({})

    vi.mocked(PipetteField).mockReturnValue(<div>mock PipetteField</div>)
    vi.mocked(TiprackField).mockReturnValue(<div>mock TiprackField</div>)
    vi.mocked(LabwareField).mockReturnValue(<div>mock LabwareField</div>)
    vi.mocked(WellSelectionField).mockReturnValue(
      <div>mock WellSelectionField</div>
    )
    vi.mocked(VolumeField).mockReturnValue(<div>mock VolumeField</div>)
    vi.mocked(PathField).mockReturnValue(<div>mock PathField</div>)
    vi.mocked(ChangeTipField).mockReturnValue(<div>mock ChangeTipField</div>)
    vi.mocked(DropTipField).mockReturnValue(<div>mock DropTipField</div>)
    vi.mocked(PickUpTipField).mockReturnValue(<div>mock PickUpTipField</div>)
    vi.mocked(TipWellSelectionField).mockReturnValue(
      <div>mock TipWellSelectionField</div>
    )
    vi.mocked(getEnableReturnTip).mockReturnValue(false)
  })

  it('renders fields', () => {
    render(props)
    screen.getByText('mock PipetteField')
    screen.getByText('mock TiprackField')
    screen.getAllByText('mock LabwareField')
    screen.getAllByText('mock WellSelectionField')
    screen.getByText('mock VolumeField')
    screen.getByText('mock PathField')
    screen.getByText('mock ChangeTipField')
    screen.getByText('mock DropTipField')
  })

  it('renders fields when feature flag is enabled', () => {
    vi.mocked(getEnableReturnTip).mockReturnValue(true)
    render(props)
    screen.getByText('mock PickUpTipField')
  })
})
