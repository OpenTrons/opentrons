// @flow
// nav bar component
import * as React from 'react'
import { useSelector } from 'react-redux'

import { VerticalNavBar } from '@opentrons/components'
import { NavButton } from './NavButton'
import { getNavbarLocations } from '../../nav'

export function NavBar(): React.Node {
  const locations = useSelector(getNavbarLocations)

  return (
    <VerticalNavBar>
      {locations.map((location, i) => (
        <NavButton
          key={location.id}
          {...location}
          isBottom={i >= locations.length - 1}
        />
      ))}
    </VerticalNavBar>
  )
}
