import { css } from 'styled-components'
import {
  COLORS,
  DIRECTION_COLUMN,
  OVERFLOW_HIDDEN,
} from '@opentrons/components'
import type { FlattenSimpleInterpolation } from 'styled-components'

export const LINK_BUTTON_STYLE = css`
  color: ${COLORS.black90};

  &:hover {
    color: ${COLORS.blue50};
  }

  &:focus-visible {
    color: ${COLORS.blue50};
    outline: 2px solid ${COLORS.blue50};
    outline-offset: 0.25rem;
  }

  &:disabled {
    color: ${COLORS.grey40};
  }
`

/**
 * Generates a CSS style for clamping text to a specified number of lines,
 * with optional word-breaking behavior.
 *
 * @param {number} lineClamp - The number of lines to clamp the text to.
 * @param {boolean} [wordBase] - Optional flag to determine word-breaking behavior.
 * If true, words will break normally; if false or undefined, words will break at any character.
 *
 * @returns {FlattenSimpleInterpolation} - The generated CSS style.
 *
 * @example
 * const style = LINE_CLAMP_TEXT_STYLE(2, true);
 * // style will clamp text to 2 lines and break words normally
 */
export const LINE_CLAMP_TEXT_STYLE = (
  lineClamp: number,
  wordBase?: boolean
): FlattenSimpleInterpolation => css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: ${OVERFLOW_HIDDEN};
  text-overflow: ellipsis;
  word-wrap: break-word;
  -webkit-line-clamp: ${lineClamp};
  word-break: ${wordBase === true
    ? 'normal'
    : 'break-all'}; // normal for tile and break-all for a non word case like aaaaaaaa
`

const MIN_OVERVIEW_WIDTH = '64rem'
const COLUMN_GRID_GAP = '5rem'
export const COLUMN_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  min-width: calc((${MIN_OVERVIEW_WIDTH} - ${COLUMN_GRID_GAP}) * 0.5);
  flex: 1;
`

export const NAV_BAR_HEIGHT_REM = 3.75

// Colors for svg
export const lightFill = COLORS.grey35
export const darkFill = COLORS.grey60

export const OT2_STANDARD_DECK_VIEW_LAYER_BLOCK_LIST: string[] = [
  'calibrationMarkings',
  'fixedBase',
  'doorStops',
  'metalFrame',
  'removalHandle',
  'removableDeckOutline',
  'screwHoles',
  'fixedTrash',
]
