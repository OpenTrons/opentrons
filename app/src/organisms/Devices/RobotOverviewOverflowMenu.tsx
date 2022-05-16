import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
  SPACING,
  TEXT_TRANSFORM_CAPITALIZE,
} from '@opentrons/components'
import { RUN_STATUS_RUNNING } from '@opentrons/api-client'
import { restartRobot } from '../../redux/robot-admin'
import { home, ROBOT } from '../../redux/robot-controls'
import { MenuItem } from '../../atoms/MenuList/MenuItem'
import { OverflowBtn } from '../../atoms/MenuList/OverflowBtn'
import { Divider } from '../../atoms/structure'
import { useCurrentRunStatus } from '../RunTimeControl/hooks'
import { useMenuHandleClickOutside } from '../../atoms/MenuList/hooks'

import type { DiscoveredRobot } from '../../redux/discovery/types'
import type { Dispatch } from '../../redux/types'

interface RobotOverviewOverflowMenuProps {
  robot: DiscoveredRobot
}

export const RobotOverviewOverflowMenu = (
  props: RobotOverviewOverflowMenuProps
): JSX.Element => {
  const { robot } = props
  const { t } = useTranslation(['devices_landing', 'robot_controls'])
  const {
    MenuOverlayPortal,
    handleOverflowClick,
    showOverflowMenu,
    setShowOverflowMenu,
  } = useMenuHandleClickOutside()
  const currentRunStatus = useCurrentRunStatus()
  const buttonDisabledReason =
    currentRunStatus === RUN_STATUS_RUNNING || robot.status === 'unreachable'

  const dispatch = useDispatch<Dispatch>()

  const handleClickRestart: React.MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    dispatch(restartRobot(robot.name))
    setShowOverflowMenu(false)
  }

  const handleClickHomeGantry: React.MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    dispatch(home(robot.name, ROBOT))
    setShowOverflowMenu(false)
  }

  return (
    <Flex
      data-testid={`RobotOverview_overflowMenu`}
      position={POSITION_RELATIVE}
      onClick={e => {
        e.preventDefault()
      }}
    >
      <OverflowBtn aria-label="overflow" onClick={handleOverflowClick} />
      {showOverflowMenu ? (
        <Flex
          width={'12rem'}
          zIndex={10}
          borderRadius={'4px 4px 0px 0px'}
          boxShadow={'0px 1px 3px rgba(0, 0, 0, 0.2)'}
          position={POSITION_ABSOLUTE}
          backgroundColor={COLORS.white}
          top={SPACING.spacing7}
          right={0}
          flexDirection={DIRECTION_COLUMN}
        >
          {/* TODO(sh, 2022-04-19): complete wiring up menu items below and disabled reasons */}
          <MenuItem disabled={buttonDisabledReason}>
            {t('update_robot_software')}
          </MenuItem>
          <MenuItem
            onClick={handleClickRestart}
            textTransform={TEXT_TRANSFORM_CAPITALIZE}
            disabled={buttonDisabledReason}
          >
            {t('robot_controls:restart_label')}
          </MenuItem>
          <MenuItem
            onClick={handleClickHomeGantry}
            disabled={buttonDisabledReason}
          >
            {t('home_gantry')}
          </MenuItem>
          <Divider marginY={'0'} />
          <MenuItem
            to={`/devices/${robot.name}/robot-settings`}
            as={Link}
            textTransform={TEXT_TRANSFORM_CAPITALIZE}
            disabled={buttonDisabledReason}
          >
            {t('robot_settings')}
          </MenuItem>
        </Flex>
      ) : null}
      <MenuOverlayPortal />
    </Flex>
  )
}
