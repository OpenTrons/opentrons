// @flow
import * as React from 'react'
import reduce from 'lodash/reduce'

import { SELECTABLE_WELL_CLASS } from '@opentrons/components'
import {
  arrayToWellGroup,
  getCollidingWells,
  getWellSetForMultichannel,
} from '../../utils'
import { SingleLabware } from './SingleLabware'
import { SelectionRect } from '../SelectionRect'
import { WellTooltip } from './WellTooltip'

import { Channels, WellMouseEvent, WellGroup } from '@opentrons/components'
import { ContentsByWell } from '../../labware-ingred/types'
import { WellIngredientNames } from '../../steplist/types'
import { GenericRect } from '../../collision-types'

export type Props = {
  labwareProps: $Diff<
    React.ElementProps<typeof SingleLabware>,
    { selectedWells: * }
  >,
  /** array of primary wells. Overrides labwareProps.selectedWells */
  selectedPrimaryWells: WellGroup,
  selectWells: (wellGroup: WellGroup) => unknown,
  deselectWells: (wellGroup: WellGroup) => unknown,
  updateHighlightedWells: (wellGroup: WellGroup) => unknown,
  pipetteChannels: Channels | null | undefined,
  ingredNames: WellIngredientNames,
  wellContents: ContentsByWell,
}

export class SelectableLabware extends React.Component<Props> {
  _getWellsFromRect: (rect: GenericRect) => WellGroup = rect => {
    const selectedWells = getCollidingWells(rect, SELECTABLE_WELL_CLASS)
    return this._wellsFromSelected(selectedWells)
  }

  _wellsFromSelected: (
    selectedWells: WellGroup
  ) => WellGroup = selectedWells => {
    const labwareDef = this.props.labwareProps.definition
    // Returns PRIMARY WELLS from the selection.
    if (this.props.pipetteChannels === 8) {
      // for the wells that have been highlighted,
      // get all 8-well well sets and merge them
      const primaryWells: WellGroup = reduce(
        selectedWells,
        (acc: WellGroup, _, wellName: string): WellGroup => {
          const wellSet = getWellSetForMultichannel(labwareDef, wellName)
          if (!wellSet) return acc
          return { ...acc, [wellSet[0]]: null }
        },
        {}
      )
      return primaryWells
    }

    // single-channel or ingred selection mode
    return selectedWells
  }

  handleSelectionMove: (e: MouseEvent, rect: GenericRect) => void = (
    e,
    rect
  ) => {
    const labwareDef = this.props.labwareProps.definition
    if (!e.shiftKey) {
      if (this.props.pipetteChannels === 8) {
        const selectedWells = this._getWellsFromRect(rect)
        const allWellsForMulti: WellGroup = reduce(
          selectedWells,
          (acc: WellGroup, _, wellName: string): WellGroup => {
            const wellSetForMulti =
              getWellSetForMultichannel(labwareDef, wellName) || []
            const channelWells = arrayToWellGroup(wellSetForMulti)
            return {
              ...acc,
              ...channelWells,
            }
          },
          {}
        )
        this.props.updateHighlightedWells(allWellsForMulti)
      } else {
        this.props.updateHighlightedWells(this._getWellsFromRect(rect))
      }
    }
  }
  handleSelectionDone: (e: MouseEvent, rect: GenericRect) => void = (
    e,
    rect
  ) => {
    const wells = this._wellsFromSelected(this._getWellsFromRect(rect))
    if (e.shiftKey) {
      this.props.deselectWells(wells)
    } else {
      this.props.selectWells(wells)
    }
  }

  handleMouseEnterWell: (args: WellMouseEvent) => void = args => {
    if (this.props.pipetteChannels === 8) {
      const labwareDef = this.props.labwareProps.definition
      const wellSet = getWellSetForMultichannel(labwareDef, args.wellName)
      const nextHighlightedWells = arrayToWellGroup(wellSet || [])
      nextHighlightedWells &&
        this.props.updateHighlightedWells(nextHighlightedWells)
    } else {
      this.props.updateHighlightedWells({ [args.wellName]: null })
    }
  }

  handleMouseLeaveWell: (args: WellMouseEvent) => void = args => {
    this.props.updateHighlightedWells({})
  }

  render(): React.Node {
    const {
      labwareProps,
      ingredNames,
      wellContents,
      pipetteChannels,
      selectedPrimaryWells,
    } = this.props

    // For rendering, show all wells not just primary wells
    const allSelectedWells =
      pipetteChannels === 8
        ? reduce<WellGroup, WellGroup>(
            selectedPrimaryWells,
            (acc, _, wellName): WellGroup => {
              const wellSet = getWellSetForMultichannel(
                this.props.labwareProps.definition,
                wellName
              )
              if (!wellSet) return acc
              return { ...acc, ...arrayToWellGroup(wellSet) }
            },
            {}
          )
        : selectedPrimaryWells

    return (
      <SelectionRect
        onSelectionMove={this.handleSelectionMove}
        onSelectionDone={this.handleSelectionDone}
      >
        <WellTooltip ingredNames={ingredNames}>
          {({
            makeHandleMouseEnterWell,
            handleMouseLeaveWell,
            tooltipWellName,
          }) => (
            <SingleLabware
              {...labwareProps}
              selectedWells={allSelectedWells}
              onMouseLeaveWell={mouseEventArgs => {
                this.handleMouseLeaveWell(mouseEventArgs)
                handleMouseLeaveWell(mouseEventArgs.event)
              }}
              selectableWellClass={SELECTABLE_WELL_CLASS}
              onMouseEnterWell={({ wellName, event }) => {
                if (wellContents !== null) {
                  this.handleMouseEnterWell({ wellName, event })
                  makeHandleMouseEnterWell(
                    wellName,
                    wellContents[wellName]?.ingreds
                  )(event)
                }
              }}
            />
          )}
        </WellTooltip>
      </SelectionRect>
    )
  }
}
