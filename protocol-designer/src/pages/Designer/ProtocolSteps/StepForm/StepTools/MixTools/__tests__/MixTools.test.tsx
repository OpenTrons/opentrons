import { describe, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { fixture96Plate } from '@opentrons/shared-data'

import { renderWithProviders } from '../../../../../../../__testing-utils__'
import {
  getLabwareEntities,
  getPipetteEntities,
} from '../../../../../../../step-forms/selectors'
import {
  getEnablePartialTipSupport,
  getEnableReturnTip,
} from '../../../../../../../feature-flags/selectors'
import { getFormErrorsMappedToField } from '../../../utils'
import { FirstStepMixTools } from '../FirstStepMixTools'
import { SecondStepMixTools } from '../SecondStepMixTools'
import { MixTools } from '..'

import type { ComponentProps } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { FieldPropsByName } from '../../../types'
import type { FormData } from '../../../../../../../form-types'
import type { StepFormErrors } from '../../../../../../../steplist'

vi.mock('../../../../../../../step-forms/selectors')
vi.mock('../../../../../../../feature-flags/selectors')
vi.mock('../../../utils')
vi.mock('../FirstStepMixTools')
vi.mock('../SecondStepMixTools')

const labwareId = 'mockLabwareId'
const pipetteId = 'mockPipetteId'

const render = (props: ComponentProps<typeof MixTools>) => {
  return renderWithProviders(<MixTools {...props} />)
}

describe('MixToolFirstStep', () => {
  let props: ComponentProps<typeof MixTools>

  beforeEach(() => {
    props = {
      propsForFields: {} as FieldPropsByName,
      formData: {} as FormData,
      toolboxStep: 0,
      visibleFormErrors: {} as StepFormErrors,
      tab: 'aspirate',
      setTab: vi.fn(),
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
    vi.mocked(getEnableReturnTip).mockReturnValue(false)
    vi.mocked(getEnablePartialTipSupport).mockReturnValue(false)
    vi.mocked(getFormErrorsMappedToField).mockReturnValue({})
    vi.mocked(FirstStepMixTools).mockReturnValue(
      <div>mock FirstStepMixTools</div>
    )
    vi.mocked(SecondStepMixTools).mockReturnValue(
      <div>mock SecondStepMixTools</div>
    )
  })

  it('renders FirstStepMixTools when toolboxStep is 0', () => {
    render(props)
    screen.getByText('mock FirstStepMixTools')
  })
  it('renders SecondStepMixTools when toolboxStep is 1', () => {
    props.toolboxStep = 1
    render(props)
    screen.getByText('mock SecondStepMixTools')
  })
})
