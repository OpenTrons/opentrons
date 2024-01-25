import * as React from 'react'
import { useSelector } from 'react-redux'
import { NavLink } from 'react-router-dom'
import styled from 'styled-components'

import {
  Icon,
  Flex,
  Box,
  COLORS,
  SPACING,
  DIRECTION_ROW,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  truncateString,
  TYPOGRAPHY,
  DIRECTION_COLUMN,
  POSITION_STICKY,
  POSITION_STATIC,
  BORDERS,
  RESPONSIVENESS,
} from '@opentrons/components'
import { ODD_FOCUS_VISIBLE } from '../../atoms/buttons/constants'

import { useNetworkConnection } from '../../resources/networking/hooks/useNetworkConnection'
import { getLocalRobot } from '../../redux/discovery'
import { NavigationMenu } from './NavigationMenu'

import type { RouteProps } from '../../App/types'

interface NavigationProps {
  routes: RouteProps[]
  //  optionalProps for setting the zIndex and position between multiple sticky elements
  //  used for ProtocolDashboard
  setNavMenuIsOpened?: React.Dispatch<React.SetStateAction<boolean>>
  longPressModalIsOpened?: boolean
}
export function Navigation(props: NavigationProps): JSX.Element {
  const { routes, setNavMenuIsOpened, longPressModalIsOpened } = props
  const localRobot = useSelector(getLocalRobot)
  const [showNavMenu, setShowNavMenu] = React.useState<boolean>(false)
  const robotName = localRobot?.name != null ? localRobot.name : 'no name'

  // We need to display an icon for what type of network connection (if any)
  // is active next to the robot's name. The designs call for it to change color
  // from black70 to black100 depending on the which page is being displayed
  // but we are using ReactRouter NavLinks, which doesn't easily support complex
  // children like this. For now the icon will just be black70 regardless.
  //
  // TODO(ew, 05/21/2023): Integrate icon into NavLink so color changes
  const networkConnection = useNetworkConnection(robotName)
  const { icon } = networkConnection
  const navRoutes = routes.filter(
    ({ navLinkTo }: RouteProps) => navLinkTo != null
  )

  const handleMenu = (openMenu: boolean): void => {
    if (setNavMenuIsOpened != null) {
      setNavMenuIsOpened(openMenu)
    }
    setShowNavMenu(openMenu)
  }

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [isScrolled, setIsScrolled] = React.useState<boolean>(false)

  const observer = new IntersectionObserver(([entry]) => {
    setIsScrolled(!entry.isIntersecting)
  })
  if (scrollRef.current != null) {
    observer.observe(scrollRef.current)
  }

  return (
    <>
      {/* Empty box to detect scrolling */}
      <Flex ref={scrollRef} />
      <Flex
        flexDirection={DIRECTION_ROW}
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        height="7.75rem"
        zIndex={showNavMenu || Boolean(longPressModalIsOpened) ? 0 : 3}
        position={
          showNavMenu || Boolean(longPressModalIsOpened)
            ? POSITION_STATIC
            : POSITION_STICKY
        }
        paddingX={SPACING.spacing40}
        top="0"
        width="100%"
        backgroundColor={COLORS.white}
        boxShadow={isScrolled ? BORDERS.shadowBig : ''}
        gridGap={SPACING.spacing24}
        aria-label="Navigation_container"
      >
        <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing32}>
          <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing8}>
            <NavigationLink
              to="/dashboard"
              name={truncateString(robotName, icon ? 12 : 15)}
            />
            {icon && (
              <Icon
                aria-label="network icon"
                name={icon}
                size="2.5rem"
                color={COLORS.grey60}
              />
            )}
          </Flex>
          {navRoutes.map(({ name, navLinkTo }: RouteProps) => (
            <NavigationLink key={name} to={navLinkTo as string} name={name} />
          ))}
        </Flex>
        <Flex marginTop={`-${SPACING.spacing12}`}>
          <IconButton
            aria-label="overflow menu button"
            onClick={() => handleMenu(true)}
          >
            <Icon
              name="overflow-btn-touchscreen"
              height="3.75rem"
              width="3rem"
              color={COLORS.grey60}
            />
          </IconButton>
        </Flex>
      </Flex>
      {showNavMenu && (
        <NavigationMenu
          onClick={() => handleMenu(false)}
          robotName={robotName}
          setShowNavMenu={setShowNavMenu}
        />
      )}
    </>
  )
}

const NavigationLink = (props: { to: string; name: string }): JSX.Element => (
  <TouchNavLink to={props.to}>
    {props.name}
    <Box width="2.5rem" height="0.3125rem" borderRadius="0.125rem" />
  </TouchNavLink>
)

const TouchNavLink = styled(NavLink)`
  ${TYPOGRAPHY.level3HeaderSemiBold}
  color: ${COLORS.grey60};
  height: 3.5rem;
  display: flex;
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_CENTER};
  white-space: nowrap;
  &.active {
    color: ${COLORS.black90};
  }
  &.active > div {
    background-color: ${COLORS.purple50};
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    cursor: default;
  }
`

const IconButton = styled('button')`
  border-radius: ${SPACING.spacing4};
  max-height: 100%;
  background-color: ${COLORS.white};

  &:active {
    background-color: ${COLORS.grey35};
  }
  &:focus-visible {
    box-shadow: ${ODD_FOCUS_VISIBLE};
    background-color: ${COLORS.grey35};
  }
  &:disabled {
    background-color: transparent;
  }
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    cursor: default;
  }
`
