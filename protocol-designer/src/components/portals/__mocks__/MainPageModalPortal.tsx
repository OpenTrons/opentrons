// mock portal for enzyme tests
import * as React from 'react'
type Props = {
  children: React.ReactNode
}
// replace Portal with a pass-through React.Fragment
export const Portal = ({ children }: Props): JSX.Element => <>{children}</>
