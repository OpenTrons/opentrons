import { it, expect, describe } from 'vitest'
import { screen } from '@testing-library/react'

import {
  FLEX_ROBOT_TYPE,
  OT2_ROBOT_TYPE,
  GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA,
} from '@opentrons/shared-data'
import { i18n } from '../../../i18n'
import { renderWithProviders } from '../../../testing/utils'
import { CommandText } from '../index'

import type {
  AspirateInPlaceRunTimeCommand,
  BlowoutInPlaceRunTimeCommand,
  BlowoutRunTimeCommand,
  CompletedProtocolAnalysis,
  ConfigureForVolumeRunTimeCommand,
  DispenseInPlaceRunTimeCommand,
  DispenseRunTimeCommand,
  DropTipInPlaceRunTimeCommand,
  DropTipRunTimeCommand,
  LabwareDefinition2,
  LoadLabwareRunTimeCommand,
  LoadLiquidRunTimeCommand,
  MoveToAddressableAreaRunTimeCommand,
  MoveToWellRunTimeCommand,
  PrepareToAspirateRunTimeCommand,
  RunTimeCommand,
  MoveToAddressableAreaForDropTipRunTimeCommand,
  LoadLiquidClassRunTimeCommand,
} from '@opentrons/shared-data'
import type { CommandTextData } from '../../ProtocolTimelineScrubber'
import { getCommandTextData } from '../../ProtocolTimelineScrubber/utils'
import { mockRobotSideAnalysis } from '../fixtures'

const mockCommandTextData: CommandTextData = {
  commands: mockRobotSideAnalysis.commands,
  pipettes: mockRobotSideAnalysis.pipettes,
  labware: mockRobotSideAnalysis.labware,
  modules: mockRobotSideAnalysis.modules,
  liquids: mockRobotSideAnalysis.liquids,
}

describe('CommandText', () => {
  it('renders correct text for aspirate', () => {
    const command = mockCommandTextData.commands.find(
      c => c.commandType === 'aspirate'
    )
    expect(command).not.toBeUndefined()
    if (command != null) {
      renderWithProviders(
        <CommandText
          allRunDefs={[]}
          commandTextData={mockCommandTextData}
          robotType={FLEX_ROBOT_TYPE}
          command={command}
        />,
        { i18nInstance: i18n }
      )
      screen.getByText(
        'Aspirating 100 µL from well A1 of NEST 1 Well Reservoir 195 mL in Slot 5 at 150 µL/sec'
      )
    }
  })
  it('renders correct text for dispense without pushOut', () => {
    const command = mockCommandTextData.commands.find(
      c => c.commandType === 'dispense'
    )
    expect(command).not.toBeUndefined()
    if (command != null) {
      renderWithProviders(
        <CommandText
          allRunDefs={[]}
          commandTextData={mockCommandTextData}
          robotType={FLEX_ROBOT_TYPE}
          command={command}
        />,
        { i18nInstance: i18n }
      )
      screen.getByText(
        'Dispensing 100 µL into well A1 of NEST 96 Well Plate 100 µL PCR Full Skirt (1) in Magnetic Module GEN2 in Slot 1 at 300 µL/sec'
      )
    }
  })
  it('renders correct text for dispense with pushOut', () => {
    const command = mockCommandTextData.commands.find(
      c => c.commandType === 'dispense'
    )
    const pushOutDispenseCommand = {
      ...command,
      params: {
        ...command?.params,
        pushOut: 10,
      },
    } as DispenseRunTimeCommand
    expect(pushOutDispenseCommand).not.toBeUndefined()
    if (pushOutDispenseCommand != null) {
      renderWithProviders(
        <CommandText
          allRunDefs={[]}
          commandTextData={mockCommandTextData}
          robotType={FLEX_ROBOT_TYPE}
          command={pushOutDispenseCommand}
        />,
        { i18nInstance: i18n }
      )
      screen.getByText(
        'Dispensing 100 µL into well A1 of NEST 96 Well Plate 100 µL PCR Full Skirt (1) in Magnetic Module GEN2 in Slot 1 at 300 µL/sec and pushing out 10 µL'
      )
    }
  })
  it('renders correct text for dispenseInPlace', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        command={
          {
            commandType: 'dispenseInPlace',
            params: {
              pipetteId: 'f6d1c83c-9d1b-4d0d-9de3-e6d649739cfb',
              flowRate: 300,
              volume: 50,
            },
          } as DispenseInPlaceRunTimeCommand
        }
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Dispensing 50 µL in place at 300 µL/sec')
  })
  it('renders correct text for blowout', () => {
    const dispenseCommand = mockCommandTextData.commands.find(
      c => c.commandType === 'dispense'
    )
    const blowoutCommand = {
      ...dispenseCommand,
      commandType: 'blowout',
    } as BlowoutRunTimeCommand
    expect(blowoutCommand).not.toBeUndefined()
    if (blowoutCommand != null) {
      renderWithProviders(
        <CommandText
          allRunDefs={[]}
          commandTextData={mockCommandTextData}
          robotType={FLEX_ROBOT_TYPE}
          command={blowoutCommand}
        />,
        { i18nInstance: i18n }
      )
      screen.getByText(
        'Blowing out at well A1 of NEST 96 Well Plate 100 µL PCR Full Skirt (1) in Magnetic Module GEN2 in Slot 1 at 300 µL/sec'
      )
    }
  })
  it('renders correct text for blowOutInPlace', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        command={
          {
            commandType: 'blowOutInPlace',
            params: {
              pipetteId: 'f6d1c83c-9d1b-4d0d-9de3-e6d649739cfb',
              flowRate: 300,
            },
          } as BlowoutInPlaceRunTimeCommand
        }
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Blowing out in place at 300 µL/sec')
  })
  it('renders correct text for aspirateInPlace', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        command={
          {
            commandType: 'aspirateInPlace',
            params: {
              pipetteId: 'f6d1c83c-9d1b-4d0d-9de3-e6d649739cfb',
              flowRate: 300,
              volume: 10,
            },
          } as AspirateInPlaceRunTimeCommand
        }
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Aspirating 10 µL in place at 300 µL/sec')
  })
  it('renders correct text for moveToWell', () => {
    const dispenseCommand = mockCommandTextData.commands.find(
      c => c.commandType === 'aspirate'
    )
    const moveToWellCommand = {
      ...dispenseCommand,
      commandType: 'moveToWell',
    } as MoveToWellRunTimeCommand
    expect(moveToWellCommand).not.toBeUndefined()
    if (moveToWellCommand != null) {
      renderWithProviders(
        <CommandText
          allRunDefs={[]}
          commandTextData={mockCommandTextData}
          robotType={FLEX_ROBOT_TYPE}
          command={moveToWellCommand}
        />,
        { i18nInstance: i18n }
      )
      screen.getByText(
        'Moving to well A1 of NEST 1 Well Reservoir 195 mL in Slot 5'
      )
    }
  })
  it('renders correct text for labware involving an addressable area slot', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'moveLabware',
          params: {
            strategy: 'usingGripper',
            labwareId: mockCommandTextData.labware[2].id,
            newLocation: { addressableAreaName: '5' },
          },
          id: 'def456',
          result: { offsetId: 'fake_offset_id' },
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Moving Opentrons 96 Tip Rack 300 µL using gripper from Slot 9 to Slot 5'
    )
  })
  it('renders correct text for moveToAddressableArea for Waste Chutes', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        command={
          {
            id: 'aca688ed-4916-496d-aae8-ca0e6e56c47b',
            commandType: 'moveToAddressableArea',
            params: {
              pipetteId: 'f6d1c83c-9d1b-4d0d-9de3-e6d649739cfb',
              addressableAreaName: '1ChannelWasteChute',
            },
          } as MoveToAddressableAreaRunTimeCommand
        }
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Moving to Waste Chute')
  })
  it('renders correct text for moveToAddressableArea for Fixed Trash', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={OT2_ROBOT_TYPE}
        command={
          {
            id: 'aca688ed-4916-496d-aae8-ca0e6e56c47c',
            commandType: 'moveToAddressableArea',
            params: {
              pipetteId: 'f6d1c83c-9d1b-4d0d-9de3-e6d649739cfb',
              addressableAreaName: 'fixedTrash',
            },
          } as MoveToAddressableAreaRunTimeCommand
        }
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Moving to Fixed Trash')
  })
  it('renders correct text for moveToAddressableArea for Trash Bins', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={OT2_ROBOT_TYPE}
        command={
          {
            id: 'aca688ed-4916-496d-aae8-ca0e6e56c47d',
            commandType: 'moveToAddressableArea',
            params: {
              pipetteId: 'f6d1c83c-9d1b-4d0d-9de3-e6d649739cfb',
              addressableAreaName: 'movableTrashD3',
            },
          } as MoveToAddressableAreaRunTimeCommand
        }
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Moving to Trash Bin in D3')
  })
  it('renders correct text for moveToAddressableAreaForDropTip for Trash Bin', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={OT2_ROBOT_TYPE}
        command={
          {
            id: 'aca688ed-4916-496d-aae8-ca0e6e56c47d',
            commandType: 'moveToAddressableAreaForDropTip',
            params: {
              pipetteId: 'f6d1c83c-9d1b-4d0d-9de3-e6d649739cfb',
              addressableAreaName: 'movableTrashD3',
              alternateDropLocation: true,
            },
          } as MoveToAddressableAreaForDropTipRunTimeCommand
        }
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Moving to Trash Bin in D3')
  })
  it('renders correct text for moveToAddressableArea for slots', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={OT2_ROBOT_TYPE}
        command={
          {
            id: 'aca688ed-4916-496d-aae8-ca0e6e56c47e',
            commandType: 'moveToAddressableArea',
            params: {
              pipetteId: 'f6d1c83c-9d1b-4d0d-9de3-e6d649739cfb',
              addressableAreaName: 'D3',
            },
          } as MoveToAddressableAreaRunTimeCommand
        }
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Moving to D3')
  })
  it('renders correct text for configureForVolume', () => {
    const command = {
      commandType: 'configureForVolume',
      params: {
        volume: 1,
        pipetteId: 'f6d1c83c-9d1b-4d0d-9de3-e6d649739cfb',
      },
    } as ConfigureForVolumeRunTimeCommand

    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        command={command}
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Configure P300 Single-Channel GEN1 to aspirate 1 µL')
  })
  it('renders correct text for prepareToAspirate', () => {
    const command = {
      commandType: 'prepareToAspirate',
      params: {
        pipetteId: 'f6d1c83c-9d1b-4d0d-9de3-e6d649739cfb',
      },
    } as PrepareToAspirateRunTimeCommand

    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        command={command}
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Preparing P300 Single-Channel GEN1 to aspirate')
  })
  it('renders correct text for dropTip', () => {
    const command = mockCommandTextData.commands.find(
      c => c.commandType === 'dropTip'
    )
    expect(command).not.toBeUndefined()
    if (command != null) {
      renderWithProviders(
        <CommandText
          allRunDefs={[]}
          commandTextData={mockCommandTextData}
          robotType={FLEX_ROBOT_TYPE}
          command={command}
        />,
        { i18nInstance: i18n }
      )
      screen.getByText('Dropping tip in A1 of Fixed Trash')
    }
  })
  it('renders correct text for dropTip into a labware', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        command={
          {
            commandType: 'dropTip',
            params: {
              labwareId: 'b2a40c9d-31b0-4f27-ad4a-c92ced91204d',
              wellName: 'A1',
              wellLocation: { origin: 'top', offset: { x: 0, y: 0, z: 0 } },
              pipetteId: 'f6d1c83c-9d1b-4d0d-9de3-e6d649739cfb',
            },
          } as DropTipRunTimeCommand
        }
      />,
      { i18nInstance: i18n }
    )
    screen.getByText(
      'Returning tip to A1 of Opentrons 96 Tip Rack 300 µL in Slot 9'
    )
  })
  it('renders correct text for dropTipInPlace', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        command={
          {
            commandType: 'dropTipInPlace',
            params: {
              pipetteId: 'f6d1c83c-9d1b-4d0d-9de3-e6d649739cfb',
            },
          } as DropTipInPlaceRunTimeCommand
        }
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Dropping tip in D3')
  })
  it('renders correct text for pickUpTip', () => {
    const command = mockCommandTextData.commands.find(
      c => c.commandType === 'pickUpTip'
    )
    expect(command).not.toBeUndefined()
    if (command != null) {
      renderWithProviders(
        <CommandText
          allRunDefs={[]}
          commandTextData={mockCommandTextData}
          robotType={FLEX_ROBOT_TYPE}
          command={command}
        />,
        { i18nInstance: i18n }
      )
      screen.getByText(
        'Picking up tip(s) from A1 of Opentrons 96 Tip Rack 300 µL in Slot 9'
      )
    }
  })
  it('renders correct text for loadPipette', () => {
    const command = mockCommandTextData.commands.find(
      c => c.commandType === 'loadPipette'
    )
    expect(command).not.toBeNull()
    if (command != null) {
      renderWithProviders(
        <CommandText
          allRunDefs={[]}
          commandTextData={mockCommandTextData}
          robotType={FLEX_ROBOT_TYPE}
          command={command}
        />,
        { i18nInstance: i18n }
      )
      screen.getByText('Load P300 Single-Channel GEN1 in Left Mount')
    }
  })
  it('renders correct text for loadModule', () => {
    const command = mockCommandTextData.commands.find(
      c => c.commandType === 'loadModule'
    )
    expect(command).not.toBeNull()
    if (command != null) {
      renderWithProviders(
        <CommandText
          allRunDefs={[]}
          commandTextData={mockCommandTextData}
          robotType={FLEX_ROBOT_TYPE}
          command={command}
        />,
        { i18nInstance: i18n }
      )
      screen.getByText('Load Magnetic Module GEN2 in Slot 1')
    }
  })
  it('renders correct text for loadLabware that is category adapter in slot', () => {
    const loadLabwareCommands = mockCommandTextData.commands.filter(
      c => c.commandType === 'loadLabware'
    )
    const loadLabwareCommand = loadLabwareCommands[0]
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        command={loadLabwareCommand}
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Load Opentrons 96 Flat Bottom Adapter in Slot 2')
  })
  it('renders correct text for loadLabware in slot', () => {
    const loadLabwareCommands = mockCommandTextData.commands.filter(
      c => c.commandType === 'loadLabware'
    )
    const loadTipRackCommand = loadLabwareCommands[2]
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        command={loadTipRackCommand}
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Load Opentrons 96 Tip Rack 300 µL in Slot 9')
  })
  it('renders correct text for loadLabware in module', () => {
    const loadLabwareCommands = mockCommandTextData.commands.filter(
      c => c.commandType === 'loadLabware'
    )
    const loadOnModuleCommand = loadLabwareCommands[3]
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        command={loadOnModuleCommand}
      />,
      { i18nInstance: i18n }
    )
    screen.getByText(
      'Load NEST 96 Well Plate 100 µL PCR Full Skirt (1) in Magnetic Module GEN2 in Slot 1'
    )
  })
  it('renders correct text for loadLabware in adapter', () => {
    const flatBottomAdapterCommand = mockCommandTextData.commands.find(
      c =>
        c.commandType === 'loadLabware' &&
        c.params.loadName === 'opentrons_96_flat_bottom_adapter'
    )

    renderWithProviders(
      <CommandText
        allRunDefs={[flatBottomAdapterCommand?.result.definition]}
        command={{
          commandType: 'loadLabware',
          params: {
            version: 1,
            namespace: 'opentrons',
            loadName: 'labwareMock',
            location: {
              labwareId:
                '29444782-bdc8-4ad8-92fe-5e28872e85e5:opentrons/opentrons_96_flat_bottom_adapter/1',
            },
          },
          id: 'def456',
          result: {
            labwareId: 'mockId',
            definition: {
              metadata: { displayName: 'mock displayName' },
            } as LabwareDefinition2,
            offset: { x: 0, y: 0, z: 0 },
          },
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Load mock displayName on Opentrons 96 Flat Bottom Adapter in Slot 2'
    )
  })
  it('renders correct text for loadLabware off deck', () => {
    const loadLabwareCommands = mockCommandTextData.commands.filter(
      c => c.commandType === 'loadLabware'
    )
    const loadOffDeckCommand = {
      ...loadLabwareCommands[4],
      params: {
        ...loadLabwareCommands[4].params,
        location: 'offDeck',
      },
    } as LoadLabwareRunTimeCommand
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        command={loadOffDeckCommand}
      />,
      { i18nInstance: i18n }
    )
    screen.getByText(
      'Load NEST 96 Well Plate 100 µL PCR Full Skirt (2) off deck'
    )
  })
  it('renders correct text for reloadLabware', () => {
    const reloadLabwareCommand = mockCommandTextData.commands.find(
      c => c.commandType === 'reloadLabware'
    )
    expect(reloadLabwareCommand).not.toBeUndefined()
    if (reloadLabwareCommand != null) {
      renderWithProviders(
        <CommandText
          allRunDefs={[]}
          commandTextData={mockCommandTextData}
          robotType={FLEX_ROBOT_TYPE}
          command={reloadLabwareCommand}
        />,
        { i18nInstance: i18n }
      )
    }
    screen.getByText('Reloading NEST 96 Well Plate 100 µL PCR Full Skirt (1)')
  })
  it('renders correct text for loadLiquid', () => {
    const loadLabwareCommands = mockCommandTextData.commands.filter(
      c => c.commandType === 'loadLabware'
    )
    const liquidId = 'zxcvbn'
    const labwareId = 'uytrew'
    const loadLiquidCommand = {
      ...loadLabwareCommands[1],
      commandType: 'loadLiquid',
      params: { liquidId, labwareId },
    } as LoadLiquidRunTimeCommand
    const analysisWithLiquids = {
      ...mockCommandTextData,
      liquids: [
        {
          id: 'zxcvbn',
          displayName: 'Water',
          description: 'wet',
          displayColor: '#0000ff',
        },
      ],
      labware: [
        {
          id: labwareId,
          loadName: 'fake_loadname',
          definitionUri: 'fake_uri',
          location: 'offDeck' as const,
          displayName: 'fakeDisplayName',
        },
      ],
    }
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={getCommandTextData(
          analysisWithLiquids as CompletedProtocolAnalysis
        )}
        robotType={FLEX_ROBOT_TYPE}
        command={loadLiquidCommand}
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Load Water into fakeDisplayName')
  })
  it('renders correct text for loadLiquidClass', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        commandTextData={mockCommandTextData} // not relevant for loading liquid class
        robotType={FLEX_ROBOT_TYPE}
        command={
          mockRobotSideAnalysis.commands.find(
            c => c.commandType === 'loadLiquidClass'
          ) as LoadLiquidClassRunTimeCommand
        }
      />,
      { i18nInstance: i18n }
    )
    screen.getByText('Loading Volatile Liquid Class')
  })
  it('renders correct text for temperatureModule/setTargetTemperature', () => {
    const mockTemp = 20
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'temperatureModule/setTargetTemperature',
          params: { celsius: mockTemp, moduleId: 'abc123' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Setting Temperature Module to 20°C (rounded to nearest integer)'
    )
  })
  it('renders correct text for temperatureModule/waitForTemperature with target temp', () => {
    const mockTemp = 20
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'temperatureModule/waitForTemperature',
          params: { celsius: mockTemp, moduleId: 'abc123' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Waiting for Temperature Module to reach 20°C')
  })
  it('renders correct text for temperatureModule/waitForTemperature with no specified temp', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'temperatureModule/waitForTemperature',
          params: { moduleId: 'abc123' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Waiting for Temperature Module to reach target temperature'
    )
  })
  it('renders correct text for thermocycler/setTargetBlockTemperature', () => {
    const mockTemp = 20
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'thermocycler/setTargetBlockTemperature',
          params: { celsius: mockTemp, moduleId: 'abc123' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Setting Thermocycler block temperature to 20°C with hold time of 0 seconds after target reached'
    )
  })
  it('renders correct text for thermocycler/setTargetLidTemperature', () => {
    const mockTemp = 20
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'thermocycler/setTargetLidTemperature',
          params: { celsius: mockTemp, moduleId: 'abc123' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Setting Thermocycler lid temperature to 20°C')
  })
  it('renders correct text for heaterShaker/setTargetTemperature', () => {
    const mockTemp = 20
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'heaterShaker/setTargetTemperature',
          params: { celsius: mockTemp, moduleId: 'abc123' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Setting Target Temperature of Heater-Shaker to 20°C')
  })
  it('renders correct text for thermocycler/runProfile on Desktop', () => {
    const mockProfileSteps = [
      { holdSeconds: 10, celsius: 20 },
      { holdSeconds: 30, celsius: 40 },
    ]
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'thermocycler/runProfile',
          params: { profile: mockProfileSteps, moduleId: 'abc123' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Running thermocycler profile with 2 steps:')
    screen.getByText('Temperature: 20°C, hold time: 0h 00m 10s')
    screen.getByText('Temperature: 40°C, hold time: 0h 00m 30s')
  })
  it('renders correct text for thermocycler/runProfile on ODD', () => {
    const mockProfileSteps = [
      { holdSeconds: 10, celsius: 20 },
      { holdSeconds: 30, celsius: 40 },
    ]
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'thermocycler/runProfile',
          params: { profile: mockProfileSteps, moduleId: 'abc123' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        isOnDevice={true}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Running thermocycler profile with 2 steps:')
    screen.getByText('Temperature: 20°C, hold time: 0h 00m 10s')
    expect(
      screen.queryByText('Temperature: 40°C, hold time: 0h 00m 30s')
    ).not.toBeInTheDocument()
  })
  it('renders correct text for thermocycler/runExtendedProfile on Desktop', () => {
    const mockProfileSteps = [
      { holdSeconds: 10, celsius: 20 },
      {
        repetitions: 10,
        steps: [
          { holdSeconds: 15, celsius: 10 },
          { holdSeconds: 12, celsius: 11 },
        ],
      },
      { holdSeconds: 30, celsius: 40 },
      {
        repetitions: 9,
        steps: [
          { holdSeconds: 13000, celsius: 12 },
          { holdSeconds: 14, celsius: 13 },
        ],
      },
    ]
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'thermocycler/runExtendedProfile',
          params: { profileElements: mockProfileSteps, moduleId: 'abc123' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Running thermocycler profile with 4 total steps and cycles:'
    )
    screen.getByText('Temperature: 20°C, hold time: 0h 00m 10s')
    screen.getByText('10 repetitions of the following steps:')
    screen.getByText('Temperature: 10°C, hold time: 0h 00m 15s')
    screen.getByText('Temperature: 11°C, hold time: 0h 00m 12s')
    screen.getByText('Temperature: 40°C, hold time: 0h 00m 30s')
    screen.getByText('9 repetitions of the following steps:')
    screen.getByText('Temperature: 12°C, hold time: 3h 36m 40s')
    screen.getByText('Temperature: 13°C, hold time: 0h 00m 14s')
  })
  it('renders correct text for thermocycler/runExtendedProfile on ODD', () => {
    const mockProfileSteps = [
      { holdSeconds: 10, celsius: 20 },
      {
        repetitions: 10,
        steps: [
          { holdSeconds: 15, celsius: 10 },
          { holdSeconds: 12, celsius: 11 },
        ],
      },
      { holdSeconds: 30, celsius: 40 },
      {
        repetitions: 9,
        steps: [
          { holdSeconds: 13, celsius: 12 },
          { holdSeconds: 14, celsius: 13 },
        ],
      },
    ]
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'thermocycler/runExtendedProfile',
          params: { profileElements: mockProfileSteps, moduleId: 'abc123' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
        isOnDevice={true}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Running thermocycler profile with 4 total steps and cycles:'
    )
    screen.getByText('Temperature: 20°C, hold time: 0h 00m 10s')

    expect(
      screen.queryByText('10 repetitions of the following steps:')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Temperature: 10°C, hold time: 0h 00m 15s')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Temperature: 11°C, hold time: 0h 00m 12s')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Temperature: 40°C, hold time: 0h 00m 30s')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('9 repetitions of the following steps:')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Temperature: 12°C, hold time: 0h 00m 13s')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Temperature: 13°C, hold time: 0h 00m 14s')
    ).not.toBeInTheDocument()
  })
  it('renders correct text for heaterShaker/setAndWaitForShakeSpeed', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'heaterShaker/setAndWaitForShakeSpeed',
          params: { rpm: 1000, moduleId: 'abc123' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Setting Heater-Shaker to shake at 1000 rpm and waiting until reached'
    )
  })
  it('renders correct text for moveToSlot', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'moveToSlot',
          params: { slotName: '1', pipetteId: 'asdfgh' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Moving to Slot 1')
  })
  it('renders correct text for moveRelative', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'moveRelative',
          params: { pipetteId: 'asdfgh', axis: 'x', distance: 10 },
          id: 'def456',
          result: { position: { x: 1, y: 2, z: 3 } },
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Moving 10 mm along x axis')
  })
  it('renders correct text for moveToCoordinates', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'moveToCoordinates',
          params: { pipetteId: 'asdfgh', coordinates: { x: 1, y: 2, z: 3 } },
          id: 'def456',
          result: { position: { x: 1, y: 2, z: 3 } },
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Moving to (X: 1, Y: 2, Z: 3)')
  })
  it('renders correct text for commands with no parsed params', () => {
    const expectedCopyByCommandType: {
      [commandType in RunTimeCommand['commandType']]?: string
    } = {
      home: 'Homing all gantry, pipette, and plunger axes',
      savePosition: 'Saving position',
      touchTip: 'Touching tip',
      'magneticModule/engage': 'Engaging Magnetic Module',
      'magneticModule/disengage': 'Disengaging Magnetic Module',
      'temperatureModule/deactivate': 'Deactivating Temperature Module',
      'thermocycler/waitForBlockTemperature':
        'Waiting for Thermocycler block to reach target temperature and holding for specified time',
      'thermocycler/waitForLidTemperature':
        'Waiting for Thermocycler lid to reach target temperature',
      'thermocycler/openLid': 'Opening Thermocycler lid',
      'thermocycler/closeLid': 'Closing Thermocycler lid',
      'thermocycler/deactivateBlock': 'Deactivating Thermocycler block',
      'thermocycler/deactivateLid': 'Deactivating Thermocycler lid',
      'thermocycler/awaitProfileComplete':
        'Waiting for Thermocycler profile to complete',
      'heaterShaker/deactivateHeater': 'Deactivating heater',
      'heaterShaker/openLabwareLatch': 'Unlatching labware on Heater-Shaker',
      'heaterShaker/closeLabwareLatch': 'Latching labware on Heater-Shaker',
      'heaterShaker/deactivateShaker': 'Deactivating shaker',
      'heaterShaker/waitForTemperature':
        'Waiting for Heater-Shaker to reach target temperature',
    } as const
    Object.entries(expectedCopyByCommandType).forEach(
      ([commandType, expectedCopy]) => {
        renderWithProviders(
          <CommandText
            allRunDefs={[]}
            command={
              {
                commandType,
                params: {},
                id: 'def456',
                result: {},
                status: 'queued',
                error: null,
                createdAt: 'fake_timestamp',
                startedAt: null,
                completedAt: null,
              } as RunTimeCommand
            }
            commandTextData={mockCommandTextData}
            robotType={FLEX_ROBOT_TYPE}
          />,
          {
            i18nInstance: i18n,
          }
        )
        expect(expectedCopy).not.toBeUndefined()
        if (expectedCopy != null) screen.getByText(expectedCopy)
      }
    )
  })
  it('renders correct text for waitForDuration', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'waitForDuration',
          params: { seconds: 42, message: 'THIS IS A MESSAGE' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Pausing for 42 seconds. THIS IS A MESSAGE')
  })
  it('renders correct text for legacy pause with message', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'pause',
          params: { message: 'THIS IS A MESSAGE' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('THIS IS A MESSAGE')
  })
  it('renders correct text for legacy pause without message', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'pause',
          params: {},
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Pausing protocol')
  })
  it('renders correct text for waitForResume with message', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'waitForResume',
          params: { message: 'THIS IS A MESSAGE' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('THIS IS A MESSAGE')
  })
  it('renders correct text for waitForResume without message', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'waitForResume',
          params: {},
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Pausing protocol')
  })
  it('renders correct text for legacy delay with time', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'delay',
          params: { seconds: 42, message: 'THIS IS A MESSAGE' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Pausing for 42 seconds. THIS IS A MESSAGE')
  })
  it('renders correct text for legacy delay wait for resume with message', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'delay',
          params: { waitForResume: true, message: 'THIS IS A MESSAGE' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('THIS IS A MESSAGE')
  })
  it('renders correct text for legacy delay wait for resume without message', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'delay',
          params: { waitForResume: true },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('Pausing protocol')
  })
  it('renders correct text for comment', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'comment',
          params: { message: 'THIS IS A MESSAGE' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('THIS IS A MESSAGE')
  })
  it('renders correct text for custom command type with legacy command text', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'custom',
          params: { legacyCommandText: 'SOME LEGACY COMMAND' },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText('SOME LEGACY COMMAND')
  })
  it('renders correct text for custom command type with arbitrary params', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'custom',
          params: {
            thunderBolts: true,
            lightning: 'yup',
            veryVeryFrightening: 1,
          },
          id: 'def456',
          result: {},
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'custom: {"thunderBolts":true,"lightning":"yup","veryVeryFrightening":1}'
    )
  })
  it('renders correct text for move labware manually off deck', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'moveLabware',
          params: {
            strategy: 'manualMoveWithPause',
            labwareId: mockCommandTextData.labware[2].id,
            newLocation: 'offDeck',
          },
          id: 'def456',
          result: { offsetId: 'fake_offset_id' },
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Manually move Opentrons 96 Tip Rack 300 µL from Slot 9 to off deck'
    )
  })
  it('renders correct text for move labware manually to module', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'moveLabware',
          params: {
            strategy: 'manualMoveWithPause',
            labwareId: mockCommandTextData.labware[3].id,
            newLocation: { slotName: 'A3' },
          },
          id: 'def456',
          result: { offsetId: 'fake_offset_id' },
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Manually move NEST 96 Well Plate 100 µL PCR Full Skirt (1) from Magnetic Module GEN2 in Slot 1 to Slot A3'
    )
  })
  it('renders correct text for move labware with gripper off deck', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'moveLabware',
          params: {
            strategy: 'usingGripper',
            labwareId: mockCommandTextData.labware[2].id,
            newLocation: 'offDeck',
          },
          id: 'def456',
          result: { offsetId: 'fake_offset_id' },
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Moving Opentrons 96 Tip Rack 300 µL using gripper from Slot 9 to off deck'
    )
  })
  it('renders correct text for move labware with gripper to waste chute', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'moveLabware',
          params: {
            strategy: 'usingGripper',
            labwareId: mockCommandTextData.labware[2].id,
            newLocation: {
              addressableAreaName: GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA,
            },
          },
          id: 'def456',
          result: { offsetId: 'fake_offset_id' },
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Moving Opentrons 96 Tip Rack 300 µL using gripper from Slot 9 to Waste Chute'
    )
  })
  it('renders correct text for move labware with gripper to module', () => {
    renderWithProviders(
      <CommandText
        allRunDefs={[]}
        command={{
          commandType: 'moveLabware',
          params: {
            strategy: 'usingGripper',
            labwareId: mockCommandTextData.labware[3].id,
            newLocation: { moduleId: mockCommandTextData.modules[0].id },
          },
          id: 'def456',
          result: { offsetId: 'fake_offset_id' },
          status: 'queued',
          error: null,
          createdAt: 'fake_timestamp',
          startedAt: null,
          completedAt: null,
        }}
        commandTextData={mockCommandTextData}
        robotType={FLEX_ROBOT_TYPE}
      />,
      {
        i18nInstance: i18n,
      }
    )
    screen.getByText(
      'Moving NEST 96 Well Plate 100 µL PCR Full Skirt (1) using gripper from Magnetic Module GEN2 in Slot 1 to Magnetic Module GEN2 in Slot 1'
    )
  })

  it('renders correct text for liquidProbe', () => {
    const command = mockCommandTextData.commands.find(
      c => c.commandType === 'liquidProbe'
    )
    expect(command).not.toBeUndefined()
    if (command != null) {
      renderWithProviders(
        <CommandText
          allRunDefs={[]}
          commandTextData={mockCommandTextData}
          robotType={FLEX_ROBOT_TYPE}
          command={command}
        />,
        { i18nInstance: i18n }
      )
      screen.getByText(
        'Detecting liquid presence in well A1 of Opentrons 96 Tip Rack 300 µL in Slot 9'
      )
    }
  })

  it('renders correct text for tryLiquidProbe', () => {
    const command = mockCommandTextData.commands.find(
      c => c.commandType === 'tryLiquidProbe'
    )
    expect(command).not.toBeUndefined()
    if (command != null) {
      renderWithProviders(
        <CommandText
          allRunDefs={[]}
          commandTextData={mockCommandTextData}
          robotType={FLEX_ROBOT_TYPE}
          command={command}
        />,
        { i18nInstance: i18n }
      )
      screen.getByText(
        'Detecting liquid presence in well A1 of Opentrons 96 Tip Rack 300 µL in Slot 9'
      )
    }
  })
})
