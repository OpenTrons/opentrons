import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import {
  ABSORBANCE_READER_V1,
  FLEX_ROBOT_TYPE,
  HEATERSHAKER_MODULE_V1,
  fixture96Plate,
} from '@opentrons/shared-data'
import { i18n } from '/protocol-designer/assets/localization'
import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { deleteContainer } from '/protocol-designer/labware-ingred/actions'
import { useKitchen } from '/protocol-designer/organisms/Kitchen/hooks'
import { deleteModule } from '/protocol-designer/modules'
import {
  getAdditionalEquipment,
  getSavedStepForms,
} from '/protocol-designer/step-forms/selectors'
import { getRobotType } from '/protocol-designer/file-data/selectors'
import { deleteDeckFixture } from '/protocol-designer/step-forms/actions/additionalItems'
import { selectors } from '/protocol-designer/labware-ingred/selectors'
import { getDismissedHints } from '/protocol-designer/tutorial/selectors'
import { getDeckSetupForActiveItem } from '/protocol-designer/top-selectors/labware-locations'
import { DeckSetupTools } from '../DeckSetupTools'
import { LabwareTools } from '../LabwareTools'

import type { ComponentProps } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

vi.mock('../LabwareTools')
vi.mock('/protocol-designer/feature-flags/selectors')
vi.mock('/protocol-designer/file-data/selectors')
vi.mock('/protocol-designer/top-selectors/labware-locations')
vi.mock('/protocol-designer/labware-ingred/actions')
vi.mock('/protocol-designer/modules')
vi.mock('/protocol-designer/step-forms/actions/additionalItems')
vi.mock('/protocol-designer/labware-ingred/selectors')
vi.mock('/protocol-designer/tutorial/selectors')
vi.mock('/protocol-designer/step-forms/selectors')
vi.mock('/protocol-designer/organisms/Kitchen/hooks')
const render = (props: ComponentProps<typeof DeckSetupTools>) => {
  return renderWithProviders(<DeckSetupTools {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const mockMakeSnackbar = vi.fn()

describe('DeckSetupTools', () => {
  let props: ComponentProps<typeof DeckSetupTools>

  beforeEach(() => {
    props = {
      onCloseClick: vi.fn(),
      setHoveredLabware: vi.fn(),
      onDeckProps: {
        setHoveredModule: vi.fn(),
        setHoveredFixture: vi.fn(),
      },
    }
    vi.mocked(selectors.getZoomedInSlotInfo).mockReturnValue({
      selectedLabwareDefUri: null,
      selectedNestedLabwareDefUri: null,
      selectedFixture: null,
      selectedModuleModel: null,
      selectedSlot: { slot: 'D3', cutout: 'cutoutD3' },
    })
    vi.mocked(LabwareTools).mockReturnValue(<div>mock labware tools</div>)
    vi.mocked(getRobotType).mockReturnValue(FLEX_ROBOT_TYPE)
    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      labware: {},
      modules: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
    })
    vi.mocked(getSavedStepForms).mockReturnValue({})
    vi.mocked(getDismissedHints).mockReturnValue([])
    vi.mocked(getAdditionalEquipment).mockReturnValue({})
    vi.mocked(useKitchen).mockReturnValue({
      makeSnackbar: mockMakeSnackbar,
      bakeToast: vi.fn(),
      eatToast: vi.fn(),
    })
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('should render the relevant modules and fixtures for slot D3 on Flex with tabs', () => {
    render(props)
    screen.getByText('Add a module')
    screen.getByText('Add a fixture')
    screen.getByTestId('DeckInfoLabel_D3')
    screen.getByText('Customize slot')
    screen.getByText('Deck hardware')
    screen.getByText('Labware')
    screen.getByText('Absorbance Plate Reader Module GEN1')
    screen.getByText('Heater-Shaker Module GEN1')
    screen.getByText('Magnetic Block GEN1')
    screen.getByText('Temperature Module GEN2')
    screen.getByText('Staging area')
    screen.getByText('Waste Chute')
    screen.getByText('Trash Bin')
    screen.getByText('Waste Chute with Staging Area')
    screen.getByText('Magnetic Block GEN1 with Staging Area')
  })
  it('should render the labware tab', () => {
    render(props)
    screen.getByText('Deck hardware')
    // click on labware tab
    fireEvent.click(screen.getByText('Labware'))
    screen.getByText('mock labware tools')
  })
  it('should clear the slot from all items when the clear cta is called', () => {
    vi.mocked(selectors.getZoomedInSlotInfo).mockReturnValue({
      selectedLabwareDefUri: 'mockUri',
      selectedNestedLabwareDefUri: 'mockUri',
      selectedFixture: null,
      selectedModuleModel: null,
      selectedSlot: { slot: 'D3', cutout: 'cutoutD3' },
    })

    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      labware: {
        labId: {
          slot: 'D3',
          id: 'labId',
          labwareDefURI: 'mockUri',
          def: fixture96Plate as LabwareDefinition2,
          pythonName: 'mockPythonName',
        },
        lab2: {
          slot: 'labId',
          id: 'labId2',
          labwareDefURI: 'mockUri',
          def: fixture96Plate as LabwareDefinition2,
          pythonName: 'mockPythonName',
        },
      },
      pipettes: {},
      modules: {
        mod: {
          model: 'heaterShakerModuleV1',
          type: 'heaterShakerModuleType',
          id: 'modId',
          slot: 'D3',
          moduleState: {} as any,
          pythonName: 'mockPythonName',
        },
      },
      additionalEquipmentOnDeck: {
        fixture: { name: 'stagingArea', id: 'mockId', location: 'cutoutD3' },
      },
    })
    render(props)
    fireEvent.click(screen.getByText('Clear'))
    expect(vi.mocked(deleteContainer)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(deleteModule)).toHaveBeenCalled()
    expect(vi.mocked(deleteDeckFixture)).toHaveBeenCalled()
  })
  it('should close and preserve h-s module when done is called', () => {
    vi.mocked(selectors.getZoomedInSlotInfo).mockReturnValue({
      selectedLabwareDefUri: null,
      selectedNestedLabwareDefUri: null,
      selectedFixture: null,
      selectedModuleModel: HEATERSHAKER_MODULE_V1,
      selectedSlot: { slot: 'D3', cutout: 'cutoutD3' },
    })
    render(props)
    fireEvent.click(screen.getByText('Heater-Shaker Module GEN1'))
    fireEvent.click(screen.getByText('Done'))
    expect(props.onCloseClick).toHaveBeenCalled()
  })
  it('should close and preserve waste chute and staging area when done is called', () => {
    vi.mocked(selectors.getZoomedInSlotInfo).mockReturnValue({
      selectedLabwareDefUri: null,
      selectedNestedLabwareDefUri: null,
      selectedFixture: 'wasteChuteAndStagingArea',
      selectedModuleModel: HEATERSHAKER_MODULE_V1,
      selectedSlot: { slot: 'D3', cutout: 'cutoutD3' },
    })
    render(props)
    fireEvent.click(screen.getByText('Waste Chute with Staging Area'))
    fireEvent.click(screen.getByText('Done'))
    expect(props.onCloseClick).toHaveBeenCalled()
  })
  it('should save plate reader if gripper configured', () => {
    vi.mocked(getAdditionalEquipment).mockReturnValue({
      gripperUri: { name: 'gripper', id: 'gripperId' },
    })
    vi.mocked(selectors.getZoomedInSlotInfo).mockReturnValue({
      selectedLabwareDefUri: null,
      selectedNestedLabwareDefUri: null,
      selectedFixture: null,
      selectedModuleModel: ABSORBANCE_READER_V1,
      selectedSlot: { slot: 'D3', cutout: 'cutoutD3' },
    })
    render(props)
    fireEvent.click(screen.getByText('Done'))
    expect(props.onCloseClick).toHaveBeenCalled()
  })
})
