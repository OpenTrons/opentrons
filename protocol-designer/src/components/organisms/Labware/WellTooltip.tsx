import { useState } from 'react'
import { useSelector } from 'react-redux'
import map from 'lodash/map'
import reduce from 'lodash/reduce'
import styled from 'styled-components'
import { createPortal } from 'react-dom'
import { Popper, Reference, Manager } from 'react-popper'
import {
  BORDERS,
  COLORS,
  CURSOR_POINTER,
  DISPLAY_FLEX,
  JUSTIFY_SPACE_BETWEEN,
  POSITION_ABSOLUTE,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { getMainPagePortalEl } from '..'
import { selectors } from '../../../labware-ingred/selectors'
import {
  formatPercentage,
  formatVolume,
} from '../../../pages/Designer/ProtocolSteps/Timeline/utils'
import { swatchColors } from '../DefineLiquidsModal/swatchColors'

import type { MouseEvent, ReactNode } from 'react'
import type { LocationLiquidState } from '@opentrons/step-generation'
import type { WellIngredientNames } from '../../../steplist/types'

const DEFAULT_TOOLTIP_OFFSET = 22
const WELL_BORDER_WIDTH = 4

interface WellTooltipParams {
  makeHandleMouseEnterWell: (
    wellName: string,
    wellIngreds: LocationLiquidState
  ) => (e: MouseEvent<any>) => void
  handleMouseLeaveWell: (val: unknown) => void
  tooltipWellName?: string | null
}

interface WellTooltipProps {
  children: (wellTooltipParams: WellTooltipParams) => ReactNode
  ingredNames: WellIngredientNames
}

interface TooltipState {
  tooltipX?: number | null
  tooltipY?: number | null
  tooltipWellName?: string | null
  tooltipWellIngreds?: LocationLiquidState | null
  tooltipOffset?: number | null
}

const initialTooltipState: TooltipState = {
  tooltipX: null,
  tooltipY: null,
  tooltipWellName: null,
  tooltipWellIngreds: null,
  tooltipOffset: DEFAULT_TOOLTIP_OFFSET,
}

//  TODO(ja, 1/15/25): this is the only component where react-popper is being used
//  we should refactor and reevaluate removing its usage in the future
export const WellTooltip = ({
  children,
  ingredNames,
}: WellTooltipProps): JSX.Element => {
  const [tooltipState, setTooltipState] = useState<TooltipState>(
    initialTooltipState
  )

  const makeHandleMouseEnterWell = (
    wellName: string,
    wellIngreds: LocationLiquidState
  ) => (e: MouseEvent) => {
    const target = e.target as Element
    if (target) {
      const { left, top, height, width } = target.getBoundingClientRect()
      if (Object.keys(wellIngreds).length > 0 && left && top) {
        setTooltipState({
          tooltipX: left + width / 2,
          tooltipY: top + height / 2,
          tooltipWellName: wellName,
          tooltipWellIngreds: wellIngreds,
          tooltipOffset: height / 2,
        })
      }
    }
  }

  const handleMouseLeaveWell = (): void => {
    setTooltipState(initialTooltipState)
  }

  const {
    tooltipX,
    tooltipY,
    tooltipOffset,
    tooltipWellIngreds,
    tooltipWellName,
  } = tooltipState

  const liquidDisplayColors = useSelector(selectors.getLiquidDisplayColors)
  const totalLiquidVolume = reduce(
    tooltipWellIngreds,
    (acc, ingred) => acc + ingred.volume,
    0
  )
  const hasMultipleIngreds = Object.keys(tooltipWellIngreds ?? {}).length > 1

  return (
    <>
      <Manager>
        <Reference>
          {({ ref }) =>
            createPortal(
              //  @ts-expect-error
              <TooltipContainer ref={ref} x={tooltipX} y={tooltipY} />,
              getMainPagePortalEl()
            )
          }
        </Reference>
        {children({
          makeHandleMouseEnterWell,
          handleMouseLeaveWell,
          tooltipWellName,
        })}
        {tooltipWellName != null ? (
          <Popper
            modifiers={{
              offset: {
                offset: `0, ${(tooltipOffset ?? 0) + WELL_BORDER_WIDTH * 2}`,
              },
            }}
          >
            {({ ref, style, placement }) =>
              createPortal(
                <PopperContent
                  ref={ref}
                  style={style}
                  data-placement={placement}
                >
                  <TooltipTable>
                    <tbody>
                      {map(tooltipWellIngreds || {}, (ingred, groupId) => (
                        <TooltipRow key={groupId}>
                          <td>
                            <ColorCircle
                              color={
                                liquidDisplayColors[Number(groupId)] ??
                                swatchColors(groupId)
                              }
                            />
                          </td>
                          <td>
                            <StyledText desktopStyle="captionRegular">
                              {ingredNames[groupId]}
                            </StyledText>
                          </td>
                          {hasMultipleIngreds && (
                            <td>
                              <StyledText desktopStyle="captionRegular">
                                {formatPercentage(
                                  ingred.volume,
                                  totalLiquidVolume
                                )}
                              </StyledText>
                            </td>
                          )}
                          <td>
                            <StyledText desktopStyle="captionRegular">
                              {formatVolume(ingred.volume, 2)}µl
                            </StyledText>
                          </td>
                        </TooltipRow>
                      ))}
                    </tbody>
                  </TooltipTable>
                  {hasMultipleIngreds && (
                    <>
                      <Divider />
                      <Footer>
                        <StyledText desktopStyle="captionRegular">{`${tooltipWellName} Total Volume`}</StyledText>
                        <StyledText desktopStyle="captionRegular">
                          {formatVolume(totalLiquidVolume, 2)}µl
                        </StyledText>
                      </Footer>
                    </>
                  )}
                </PopperContent>,
                getMainPagePortalEl()
              )
            }
          </Popper>
        ) : null}
      </Manager>
    </>
  )
}

const TooltipContainer = styled.div.attrs<{
  x: number | null
  y: number | null
}>(({ x, y }) => ({
  style: {
    top: y || undefined,
    left: x || undefined,
  },
}))`
  position: ${POSITION_ABSOLUTE};
`

const PopperContent = styled.div`
  font-size: ${TYPOGRAPHY.fontSizeCaption};
  font-weight: ${TYPOGRAPHY.fontWeightRegular};
  color: ${COLORS.white};
  background-color: ${COLORS.black90};
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.13), 0 3px 6px rgba(0, 0, 0, 0.23);
  padding: ${SPACING.spacing8};
  cursor: ${CURSOR_POINTER};
  z-index: 10000;
  border-radius: ${BORDERS.borderRadius8};
`

const TooltipTable = styled.table`
  margin: 0.5em;
  max-width: 20rem;
`

const TooltipRow = styled.tr`
  min-width: 11.25rem;
`

const ColorCircle = styled.div<{ color: string }>`
  height: 2em;
  width: 2em;
  border-radius: 50%;
  margin-right: 1em;
  background-color: ${({ color }) => color};
`

const Divider = styled.div`
  height: 1px;
  width: 100%;
  background-color: ${COLORS.grey60};
  margin: 1em 0;
`

const Footer = styled.div`
  display: ${DISPLAY_FLEX};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
`
