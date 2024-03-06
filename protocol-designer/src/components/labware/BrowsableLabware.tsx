import * as React from 'react'
import { useSelector } from 'react-redux'
import reduce from 'lodash/reduce'

import { selectors } from '../../labware-ingred/selectors'
import { SingleLabware } from './SingleLabware'
import { wellFillFromWellContents } from './utils'
import { ContentsByWell } from '../../labware-ingred/types'
import { WellIngredientNames } from '../../steplist/types'
import { WellGroup, WELL_LABEL_OPTIONS } from '@opentrons/components'
import { LabwareDefinition2 } from '@opentrons/shared-data'

import { WellTooltip } from './WellTooltip'

interface Props {
  definition?: LabwareDefinition2 | null
  ingredNames: WellIngredientNames
  wellContents: ContentsByWell
}

export function BrowsableLabware(props: Props): JSX.Element | null {
  const { definition, ingredNames, wellContents } = props
  const liquidDisplayColors = useSelector(selectors.getLiquidDisplayColors)
  if (!definition) {
    console.assert(definition, 'BrowseLabwareModal expected definition')
    return null
  }

  return (
    <WellTooltip ingredNames={ingredNames}>
      {({
        makeHandleMouseEnterWell,
        handleMouseLeaveWell,
        tooltipWellName,
      }) => (
        <SingleLabware
          definition={definition}
          wellLabelOption={WELL_LABEL_OPTIONS.SHOW_LABEL_INSIDE}
          wellFill={wellFillFromWellContents(wellContents, liquidDisplayColors)}
          highlightedWells={
            wellContents === null
              ? null
              : reduce(
                  wellContents,
                  (acc, _, wellName): WellGroup =>
                    tooltipWellName === wellName
                      ? { ...acc, [wellName]: null }
                      : acc,
                  {}
                )
          }
          onMouseEnterWell={({ event, wellName }) =>
            wellContents === null
              ? null
              : makeHandleMouseEnterWell(
                  wellName,
                  wellContents[wellName].ingreds
                )(event)
          }
          onMouseLeaveWell={handleMouseLeaveWell}
        />
      )}
    </WellTooltip>
  )
}
