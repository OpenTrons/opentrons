import { useState } from 'react'
import reduce from 'lodash/reduce'
import pick from 'lodash/pick'

import { COLORS, Labware, RobotCoordinateSpace } from '@opentrons/components'
import {
  arrayToWellGroup,
  getCollidingWells,
  getWellSetForMultichannel,
} from './utils'
import { Selection384Wells } from './Selection384Wells'
import { SelectionRect } from './SelectionRect'

import type { WellFill, WellGroup, WellStroke } from '@opentrons/components'
import type {
  LabwareDefinition2,
  PipetteChannels,
  NozzleLayoutDetails,
} from '@opentrons/shared-data'
import type { GenericRect } from './types'

interface WellSelectionProps {
  definition: LabwareDefinition2
  deselectWells: (wells: string[]) => void
  /* The actual wells that are clicked. */
  selectedPrimaryWells: WellGroup
  selectWells: (wellGroup: WellGroup) => unknown
  channels: PipetteChannels
  /* Highlight only valid wells given the current pipette nozzle configuration. */
  pipetteNozzleDetails?: NozzleLayoutDetails
  /* Whether highlighting and selectWells() updates are permitted. */
  allowSelect?: boolean
  /* Whether selecting more than the channel count of well locations is permitted. */
  allowMultiDrag?: boolean
}

export function WellSelection(props: WellSelectionProps): JSX.Element {
  const {
    definition,
    deselectWells,
    selectedPrimaryWells,
    selectWells,
    channels,
    pipetteNozzleDetails,
    allowSelect = true,
    allowMultiDrag = true,
  } = props
  const [highlightedWells, setHighlightedWells] = useState<WellGroup>({})

  const _wellsFromSelected: (
    selectedWells: WellGroup
  ) => WellGroup = selectedWells => {
    // Returns PRIMARY WELLS from the selection.
    if (channels === 8 || channels === 96) {
      // for the wells that have been highlighted,
      // get all 8-well well sets and merge them
      const primaryWells: WellGroup = reduce(
        selectedWells,
        (acc: WellGroup, _, wellName: string): WellGroup => {
          const wellSet = getWellSetForMultichannel({
            labwareDef: definition,
            wellName,
            channels,
            pipetteNozzleDetails,
          })
          if (!wellSet) {
            return acc
          } else if (allowMultiDrag) {
            return { ...acc, [wellSet[0]]: null }
          } else {
            return { [wellSet[0]]: null }
          }
        },
        {}
      )
      return primaryWells
    } else {
      // single-channel or ingred selection mode
      return allowMultiDrag
        ? selectedWells
        : pick(selectedWells, Object.keys(selectedWells)[0])
    }
  }

  const _getWellsFromRect: (rect: GenericRect) => WellGroup = rect => {
    const selectedWells = getCollidingWells(rect)
    return _wellsFromSelected(selectedWells)
  }

  const handleSelectionMove: (rect: GenericRect) => void = rect => {
    if (allowSelect) {
      if (channels === 8 || channels === 96) {
        const selectedWells = _getWellsFromRect(rect)
        const allWellsForMulti: WellGroup = reduce(
          selectedWells,
          (acc: WellGroup, _, wellName: string): WellGroup => {
            const wellSetForMulti =
              getWellSetForMultichannel({
                labwareDef: definition,
                wellName,
                channels,
                pipetteNozzleDetails,
              }) || []
            const channelWells = arrayToWellGroup(wellSetForMulti)
            return {
              ...acc,
              ...channelWells,
            }
          },
          {}
        )
        setHighlightedWells(allWellsForMulti)
      } else {
        setHighlightedWells(_getWellsFromRect(rect))
      }
    }
  }

  const handleSelectionDone: (rect: GenericRect) => void = rect => {
    const wells = _wellsFromSelected(_getWellsFromRect(rect))

    if (allowSelect) {
      selectWells(wells)
      setHighlightedWells({})
    }
  }

  // For rendering, show all valid wells, not just primary wells
  const allSelectedWells =
    channels === 8 || channels === 96
      ? reduce<WellGroup, WellGroup>(
          selectedPrimaryWells,
          (acc, _, wellName): WellGroup => {
            const wellSet = getWellSetForMultichannel({
              labwareDef: definition,
              wellName,
              channels,
              pipetteNozzleDetails,
            })
            if (!wellSet) {
              return acc
            }
            return { ...acc, ...arrayToWellGroup(wellSet) }
          },
          {}
        )
      : selectedPrimaryWells

  const wellFill: WellFill = {}
  const wellStroke: WellStroke = {}
  Object.keys(definition.wells).forEach(wellName => {
    wellFill[wellName] = COLORS.blue35
    wellStroke[wellName] = COLORS.transparent
  })
  Object.keys(allSelectedWells).forEach(wellName => {
    wellFill[wellName] = COLORS.blue50
    wellStroke[wellName] = COLORS.transparent
  })
  Object.keys(highlightedWells).forEach(wellName => {
    wellFill[wellName] = COLORS.blue50
    wellStroke[wellName] = COLORS.transparent
  })

  const labwareRender = (
    <RobotCoordinateSpace viewBox="0 0 128 86">
      <Labware
        definition={definition}
        hideOutline
        isInteractive
        showLabels={true}
        wellFill={wellFill}
        wellStroke={wellStroke}
      />
    </RobotCoordinateSpace>
  )
  return definition.parameters.format === '384Standard' ? (
    <Selection384Wells
      allSelectedWells={allSelectedWells}
      channels={channels}
      definition={definition}
      deselectWells={deselectWells}
      labwareRender={labwareRender}
      selectWells={selectWells}
    />
  ) : (
    <SelectionRect
      onSelectionMove={handleSelectionMove}
      onSelectionDone={handleSelectionDone}
    >
      {labwareRender}
    </SelectionRect>
  )
}
