import { css } from 'styled-components'
import { spacing1, spacingXXS } from './spacing'
import { blue, medGrey, transparent } from './colors'

export const radiusSoftCorners = '4px'
export const radiusRoundEdge = '20px'
export const styleSolid = 'solid'

export const tabBorder = css`
  border-bottom-style: ${styleSolid};
  border-bottom-width: ${spacing1};
  border-bottom-color: ${blue};
`

export const lineBorder = `${spacingXXS} ${styleSolid} ${medGrey}`
export const transparentLineBorder = `${spacingXXS} ${styleSolid} ${transparent}`
export const cardOutlineBorder = css`
  border-style: ${styleSolid};
  border-width: ${spacingXXS};
  border-color: ${medGrey};
  border-radius: ${radiusSoftCorners};
`
