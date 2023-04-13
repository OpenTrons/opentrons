import * as React from 'react'
import { useSelector } from 'react-redux'
import { NavLink } from 'react-router-dom'
import styled from 'styled-components'

import {
  Flex,
  Icon,
  COLORS,
  SPACING,
  DIRECTION_ROW,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  ALIGN_FLEX_START,
  JUSTIFY_CENTER,
  ALIGN_END,
} from '@opentrons/components'

import { OverflowBtn } from '../../../atoms/MenuList/OverflowBtn'
import { StyledText } from '../../../atoms/text'
import { getLocalRobot } from '../../../redux/discovery'
import { NavigationMenu } from './NavigationMenu'

import type { RouteProps } from '../../../App/types'

const NavigationLink = styled(NavLink)`
  color: ${COLORS.black};
  display: flex;
  grid-gap: 0.5rem;

  &.active {
    color: ${COLORS.blueEnabled};
  }
`

export function Navigation({ routes }: { routes: RouteProps[] }): JSX.Element {
  const localRobot = useSelector(getLocalRobot)
  const [showNavMenu, setNavMenu] = React.useState(false)
  const robotName = localRobot?.name != null ? localRobot.name : 'no name'
  const navRoutes = routes.filter(
    ({ navLinkTo }: RouteProps) => navLinkTo != null
  )

  return (
    <>
      {showNavMenu ? (
        <NavigationMenu
          onClick={() => setNavMenu(false)}
          robotName={robotName}
        />
      ) : (
        <Flex
          flexDirection={DIRECTION_ROW}
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          marginBottom={SPACING.spacing5}
        >
          <Flex
            flexDirection={DIRECTION_ROW}
            alignItems={ALIGN_FLEX_START}
            justifyContent={JUSTIFY_CENTER}
            gridGap="0.5rem"
          >
            <NavigationLink to="/dashboard">
              <StyledText
                fontSize="1.625rem"
                fontWeight="700"
                lineHeight="1.9375rem"
              >
                {robotName}
              </StyledText>
            </NavigationLink>
            <Icon name="wifi" size="2rem" />
          </Flex>
          <Flex flexDirection={DIRECTION_ROW}>
            {navRoutes.map(({ name, navLinkTo }: RouteProps) => (
              <NavigationLink key={name} to={navLinkTo as string}>
                <StyledText
                  fontSize="1.625rem"
                  fontWeight="600"
                  lineHeight="1.9375rem"
                  marginRight="2.75rem"
                >
                  {name}
                </StyledText>
              </NavigationLink>
            ))}
          </Flex>
          <Flex alignItems={ALIGN_END}>
            <OverflowBtn
              isOnDevice={true}
              onClick={() => setNavMenu(true)}
              aria-label="Navigation_OverflowBtn"
            />
          </Flex>
        </Flex>
      )}
    </>
  )
}
