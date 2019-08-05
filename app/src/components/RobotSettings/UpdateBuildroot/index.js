// @flow
import * as React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import VersionInfoModal from './VersionInfoModal'
import ViewUpdateModal from './ViewUpdateModal'
import InstallModal from './InstallModal'
import {
  startBuildrootUpdate,
  setBuildrootUpdateSeen,
  buildrootUpdateIgnored,
  getBuildrootSession,
  clearBuildrootSession,
  getRobotSystemType,
  compareRobotVersionToUpdate,
} from '../../../shell'

import type { Dispatch } from '../../../types'
import type { ViewableRobot } from '../../../discovery'

type Props = {|
  robot: ViewableRobot,
  close: () => mixed,
|}

export default function UpdateBuildroot(props: Props) {
  const { robot, close } = props
  const robotName = robot.name
  const [viewUpdateInfo, setViewUpdateInfo] = React.useState(false)
  const session = useSelector(getBuildrootSession)
  const dispatch = useDispatch<Dispatch>()
  const { step, error } = session || { step: null, error: null }

  // set update seen on component mount
  React.useEffect(() => {
    dispatch(setBuildrootUpdateSeen(robotName))
  }, [dispatch, robotName])

  // clear buildroot state on component dismount if done
  React.useEffect(() => {
    if (step === 'finished' || error !== null) {
      return () => {
        dispatch(clearBuildrootSession())
      }
    }
  }, [dispatch, step, error])

  const goToViewUpdate = React.useCallback(() => setViewUpdateInfo(true), [])

  const ignoreUpdate = React.useCallback(() => {
    dispatch(buildrootUpdateIgnored(robotName))
    close()
  }, [dispatch, robotName, close])

  const installUpdate = React.useCallback(
    () => dispatch(startBuildrootUpdate(robotName)),
    [dispatch, robotName]
  )

  const robotSystemType = getRobotSystemType(robot)
  const robotUpdateType = compareRobotVersionToUpdate(robot)

  if (session) {
    return (
      <InstallModal
        robot={robot}
        robotSystemType={robotSystemType}
        session={session}
        close={close}
      />
    )
  }

  if (!viewUpdateInfo) {
    return (
      <VersionInfoModal
        robot={robot}
        robotUpdateType={robotUpdateType}
        close={ignoreUpdate}
        proceed={goToViewUpdate}
      />
    )
  }

  return (
    <ViewUpdateModal
      robotName={robotName}
      robotUpdateType={robotUpdateType}
      robotSystemType={robotSystemType}
      close={ignoreUpdate}
      proceed={installUpdate}
    />
  )
}
