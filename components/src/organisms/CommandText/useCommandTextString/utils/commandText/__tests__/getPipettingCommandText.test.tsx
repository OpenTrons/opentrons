import { screen } from '@testing-library/react'
import { vi, describe, it, beforeEach } from 'vitest'
import { useTranslation } from 'react-i18next'

import { renderWithProviders } from '../../../../../../testing/utils'
import { i18n } from '../../../../../../i18n'
import { getPipettingCommandText } from '../getPipettingCommandText'
import { getLabwareDefURI } from '@opentrons/shared-data'
import { getFinalLabwareLocation } from '../../getFinalLabwareLocation'
import { getWellRange } from '../../getWellRange'
import { getLabwareDefinitionsFromCommands } from '../../getLabwareDefinitionsFromCommands'
import { getLabwareName } from '../../getLabwareName'
import { getLoadedLabware } from '../../getLoadedLabware'
import { getLabwareDisplayLocation } from '../../getLabwareDisplayLocation'
import { getFinalMoveToAddressableAreaCmd } from '../../getFinalAddressableAreaCmd'
import { getAddressableAreaDisplayName } from '../../getAddressableAreaDisplayName'

vi.mock('@opentrons/shared-data')
vi.mock('../../getFinalLabwareLocation')
vi.mock('../../getWellRange')
vi.mock('../../getLabwareDefinitionsFromCommands')
vi.mock('../../getFinalAddressableAreaCmd')
vi.mock('../../getAddressableAreaDisplayName')
vi.mock('../../getLabwareName')
vi.mock('../../getLabwareDisplayLocation')
vi.mock('../../getLoadedLabware')

const baseCommandData = {
  allRunDefs: {},
  robotType: 'OT-2',
  commandTextData: {
    commands: [],
    labware: [],
    modules: [],
    pipettes: [{ id: 'pipette-1', pipetteName: 'p300_single' }],
  },
} as any

function TestWrapper({ command }: { command: any }): JSX.Element {
  const { t } = useTranslation('protocol_command_text')
  const text = getPipettingCommandText({
    command,
    ...baseCommandData,
    t,
  })

  return <div>{text}</div>
}

const render = (command: any) => {
  return renderWithProviders(<TestWrapper command={command} />, {
    i18nInstance: i18n,
  })
}

describe('getPipettingCommandText', () => {
  beforeEach(() => {
    vi.mocked(getLabwareDefURI).mockImplementation((def: any) => def.uri)
    vi.mocked(getFinalLabwareLocation).mockReturnValue('slot-1' as any)
    vi.mocked(getWellRange).mockReturnValue('A1')
    vi.mocked(getLabwareDefinitionsFromCommands).mockReturnValue([
      { uri: 'tiprack-uri', parameters: { isTiprack: true } },
      { uri: 'plate-uri', parameters: { isTiprack: false } },
    ] as any)
    vi.mocked(getLabwareName).mockReturnValue('Test Labware')
    vi.mocked(getLoadedLabware).mockImplementation(
      (labware, id) =>
        ({
          definitionUri: id === 'tiprack-id' ? 'tiprack-uri' : 'plate-uri',
        } as any)
    )
    vi.mocked(getLabwareDisplayLocation).mockReturnValue('Slot 1')
    vi.mocked(getFinalMoveToAddressableAreaCmd).mockReturnValue({
      id: 'cmd-1',
      commandType: 'moveToAddressableArea',
    } as any)
    vi.mocked(getAddressableAreaDisplayName).mockReturnValue('Fixed Trash')
  })

  it('should render aspirate command text correctly', () => {
    const command = {
      id: 'cmd-1',
      commandType: 'aspirate',
      params: {
        labwareId: 'labware-1',
        wellName: 'A1',
        volume: 100,
        flowRate: 150,
      },
    }

    render(command)
    screen.getByText(
      /Aspirating 100 µL from well A1 of Test Labware in Slot 1 at 150 µL\/sec/
    )
  })

  it('should render dispense command text correctly', () => {
    const command = {
      id: 'cmd-1',
      commandType: 'dispense',
      params: {
        labwareId: 'labware-1',
        wellName: 'A1',
        volume: 100,
        flowRate: 150,
      },
    }

    render(command)
    screen.getByText(
      /Dispensing 100 µL into well A1 of Test Labware in Slot 1 at 150 µL\/sec/
    )
  })

  it('should render dispense with push out command text correctly', () => {
    const command = {
      id: 'cmd-1',
      commandType: 'dispense',
      params: {
        labwareId: 'labware-1',
        wellName: 'A1',
        volume: 100,
        flowRate: 150,
        pushOut: 10,
      },
    }

    render(command)
    screen.getByText(
      /Dispensing 100 µL into well A1 of Test Labware in Slot 1 at 150 µL\/sec and pushing out 10 µL/
    )
  })

  it('should render pickup tip command text correctly', () => {
    const command = {
      id: 'cmd-1',
      commandType: 'pickUpTip',
      params: {
        labwareId: 'tiprack-id',
        wellName: 'A1',
        pipetteId: 'pipette-1',
      },
    }

    render(command)
    screen.getByText(/Picking up tip\(s\) from A1 of Test Labware in Slot 1/)
  })

  it('should render drop tip in tiprack command text correctly', () => {
    const command = {
      id: 'cmd-1',
      commandType: 'dropTip',
      params: {
        labwareId: 'tiprack-id',
        wellName: 'A1',
      },
    }

    render(command)
    screen.getByText(/Returning tip to A1 of Test Labware in Slot 1/)
  })

  it('should render drop tip in place command text correctly if there is an addressable area name', () => {
    const command = {
      id: 'cmd-1',
      commandType: 'dropTipInPlace',
      params: {},
    }

    render(command)
    screen.getByText('Dropping tip in Fixed Trash')
  })

  it('should render drop tip in place command text correctly if there is not an addressable area name', () => {
    const command = {
      id: 'cmd-1',
      commandType: 'dropTipInPlace',
      params: {},
    }

    vi.mocked(getFinalMoveToAddressableAreaCmd).mockReturnValue(null)

    render(command)
    screen.getByText('Dropping tip in place')
  })
})
