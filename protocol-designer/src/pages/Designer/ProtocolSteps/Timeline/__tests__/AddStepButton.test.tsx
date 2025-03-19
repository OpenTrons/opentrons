import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import {
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  TEMPERATURE_MODULE_TYPE,
  TEMPERATURE_MODULE_V1,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V1,
} from '@opentrons/shared-data'
import { renderWithProviders } from '../../../../../__testing-utils__'
import { i18n } from '../../../../../assets/localization'
import { OFFDECK } from '../../../../../constants'
import { getEnableComment } from '../../../../../feature-flags/selectors'
import {
  getInitialRobotState,
  getRobotStateTimeline,
} from '../../../../../file-data/selectors'
import {
  getCurrentFormIsPresaved,
  getInitialDeckSetup,
  getLabwareEntities,
} from '../../../../../step-forms/selectors'
import { getIsMultiSelectMode } from '../../../../../ui/steps'
import { AddStepButton } from '../AddStepButton'

import type {
  LabwareDefinition2,
  LabwareParameters,
} from '@opentrons/shared-data'

import type { ComponentProps } from 'react'
import type { LabwareEntity, RobotState } from '@opentrons/step-generation'

vi.mock('../../../../../feature-flags/selectors')
vi.mock('../../../../../file-data/selectors')
vi.mock('../../../../../step-forms/selectors')
vi.mock('../../../../../ui/steps')

const render = (props: ComponentProps<typeof AddStepButton>) => {
  return renderWithProviders(<AddStepButton {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const MOCK_TIPRACK_ID = 'mockTiprackId'
const MOCK_TUBERACK_ID = 'mockTuberackId'
const MOCK_TIPRACK_ENTITY = {
  id: MOCK_TIPRACK_ID,
  def: {
    parameters: {
      isTiprack: true,
    } as LabwareParameters,
  } as LabwareDefinition2,
} as LabwareEntity
const MOCK_TIPRACK_LABWARE = {
  slot: 'C2',
}
const MOCK_TUBERACK_LABWARE_ONDECK = {
  slot: 'C2',
}
const MOCK_TUBERACK_LABWARE_OFFDECK = {
  slot: OFFDECK,
}

const MOCK_INITIAL_ROBOT_STATE = {
  labware: {
    [MOCK_TIPRACK_ID]: MOCK_TIPRACK_LABWARE,
    [MOCK_TUBERACK_ID]: MOCK_TUBERACK_LABWARE_ONDECK,
  },
  modules: {},
  pipettes: {
    'a212ebf2-bbd7-4946-a0e7-894a55e730ce': {
      mount: 'left',
    },
  },
  liquidState: {
    pipettes: {},
    labware: {},
    additionalEquipment: {},
  },
  tipState: {
    pipettes: {},
    tipracks: {},
  },
} as RobotState

const MOCK_TUBERACK_ENTITY = {
  labwareDefURI:
    'opentrons/opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical/1',
  id: MOCK_TUBERACK_ID,
  def: {
    parameters: {
      isTiprack: false,
    } as LabwareParameters,
  } as LabwareDefinition2,
} as LabwareEntity

describe('AddStepButton', () => {
  let props: ComponentProps<typeof AddStepButton>

  beforeEach(() => {
    props = {
      hasText: true,
    }
    vi.mocked(getEnableComment).mockReturnValue(true)
    vi.mocked(getCurrentFormIsPresaved).mockReturnValue(false)
    vi.mocked(getIsMultiSelectMode).mockReturnValue(false)
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {
        hs: {
          model: HEATERSHAKER_MODULE_V1,
          type: HEATERSHAKER_MODULE_TYPE,
          id: 'mockId',
          moduleState: {} as any,
          slot: 'A1',
          pythonName: 'mockPythonName',
        },
        tc: {
          model: THERMOCYCLER_MODULE_V1,
          type: THERMOCYCLER_MODULE_TYPE,
          id: 'mockId',
          moduleState: {} as any,
          slot: 'B1',
          pythonName: 'mockPythonName',
        },
        temp: {
          model: TEMPERATURE_MODULE_V1,
          type: TEMPERATURE_MODULE_TYPE,
          id: 'mockId',
          moduleState: {} as any,
          slot: 'C1',
          pythonName: 'mockPythonName',
        },
        mag: {
          model: MAGNETIC_MODULE_V1,
          type: MAGNETIC_MODULE_TYPE,
          id: 'mockId',
          moduleState: {} as any,
          slot: 'D1',
          pythonName: 'mockPythonName',
        },
      },
      labware: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
    })
    vi.mocked(getRobotStateTimeline).mockReturnValue({ timeline: [] })
    vi.mocked(getLabwareEntities).mockReturnValue({
      [MOCK_TIPRACK_ID]: MOCK_TIPRACK_ENTITY,
      [MOCK_TUBERACK_ID]: MOCK_TUBERACK_ENTITY,
    })
    vi.mocked(getInitialRobotState).mockReturnValue(MOCK_INITIAL_ROBOT_STATE)
  })

  it('renders add step button and clicking on it renders the overflow menu with all modules', () => {
    render(props)
    fireEvent.click(screen.getByText('Add Step'))
    screen.getByText('Comment')
    screen.getByText('Transfer')
    screen.getByText('Mix')
    screen.getByText('Pause')
    screen.getByText('Thermocycler')
    screen.getByText('Heater-Shaker')
    screen.getByText('Temperature')
    screen.getByText('Magnet')
  })

  it('should not render texts if hasText is false', () => {
    props.hasText = false
    render(props)
    const text = screen.queryByText('Add Step')
    expect(text).toBeNull()
  })

  it('should not render liquid handling steps if no compatible labware is present in entities', () => {
    vi.mocked(getLabwareEntities).mockReturnValue({
      [MOCK_TIPRACK_ID]: MOCK_TIPRACK_ENTITY,
    })
    render(props)
    fireEvent.click(screen.getByText('Add Step'))
    screen.getByText('Comment')
    expect(screen.queryByText('Transfer')).not.toBeInTheDocument()
    expect(screen.queryByText('Mix')).not.toBeInTheDocument()
    screen.getByText('Pause')
    screen.getByText('Thermocycler')
    screen.getByText('Heater-Shaker')
    screen.getByText('Temperature')
    screen.getByText('Magnet')
  })

  it('should not render liquid handling steps if no compatible labware on deck', () => {
    vi.mocked(getInitialRobotState).mockReturnValue({
      ...MOCK_INITIAL_ROBOT_STATE,
      labware: {
        ...MOCK_INITIAL_ROBOT_STATE.labware,
        [MOCK_TUBERACK_ID]: MOCK_TUBERACK_LABWARE_OFFDECK,
      },
    })
    render(props)
    fireEvent.click(screen.getByText('Add Step'))
    screen.getByText('Comment')
    expect(screen.queryByText('Transfer')).not.toBeInTheDocument()
    expect(screen.queryByText('Mix')).not.toBeInTheDocument()
    screen.getByText('Pause')
    screen.getByText('Thermocycler')
    screen.getByText('Heater-Shaker')
    screen.getByText('Temperature')
    screen.getByText('Magnet')
  })
})
