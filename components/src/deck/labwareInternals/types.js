// @flow
export type WellMouseEvent = {|
  wellName: string,
  event: SyntheticMouseEvent<*>,
|}

// wellName to CSS color, eg {'A1': '#123456'}
export type WellFill = { [wellName: string]: string }

// Use this like a Set!
export type WellGroup = { [wellName: string]: null }
