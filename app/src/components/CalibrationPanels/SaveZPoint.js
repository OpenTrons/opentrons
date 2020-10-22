// @flow
import * as React from 'react'
import { css } from 'styled-components'
import {
  PrimaryBtn,
  Box,
  Flex,
  Text,
  FONT_WEIGHT_SEMIBOLD,
  FONT_SIZE_HEADER,
  FONT_SIZE_BODY_2,
  DIRECTION_ROW,
  SPACING_3,
  SPACING_5,
  BORDER_SOLID_LIGHT,
  JUSTIFY_CENTER,
  ALIGN_CENTER,
  TEXT_TRANSFORM_UPPERCASE,
} from '@opentrons/components'

import * as Sessions from '../../sessions'
import type { SessionType } from '../../sessions/types'
import type { JogAxis, JogDirection, JogStep } from '../../http-api-client'
import type { CalibrationPanelProps } from './types'
import { JogControls } from '../JogControls'
import { formatJogVector } from './utils'
import { useConfirmCrashRecovery } from './useConfirmCrashRecovery'

import slot5LeftMultiDemoAsset from '../../assets/videos/cal-movement/SLOT_5_LEFT_MULTI_Z.webm'
import slot5LeftSingleDemoAsset from '../../assets/videos/cal-movement/SLOT_5_LEFT_SINGLE_Z.webm'
import slot5RightMultiDemoAsset from '../../assets/videos/cal-movement/SLOT_5_RIGHT_MULTI_Z.webm'
import slot5RightSingleDemoAsset from '../../assets/videos/cal-movement/SLOT_5_RIGHT_SINGLE_Z.webm'

const assetMap = {
  left: {
    multi: slot5LeftMultiDemoAsset,
    single: slot5LeftSingleDemoAsset,
  },
  right: {
    multi: slot5RightMultiDemoAsset,
    single: slot5RightSingleDemoAsset,
  },
}

const CALIBRATE = 'calibrate'
const CHECK = 'check'
const TARGET_SLOT = 'slot 5'
const BASE_HEADER = `z-axis in ${TARGET_SLOT}`
const JOG_UNTIL = 'Jog the pipette until the tip is'
const JUST_BARELY_TOUCHING = 'barely touching (less than 0.1mm)'
const DECK_IN = 'the deck in'
const THEN = 'Then press the'
const DECK_CAL_BUTTON_TEXT = 'remember z-axis and move to slot 1'
const PIP_OFFSET_BUTTON_TEXT = 'save calibration and move to slot 1'
const CALIBRATION_HEALTH_BUTTON_TEXT = 'Go To Next Check'
const TO_USE_Z =
  'button to use this z position for the rest of deck calibration'

const contentsBySessionType: {
  [SessionType]: {
    headerText: string,
    buttonText: string,
  },
} = {
  [Sessions.SESSION_TYPE_DECK_CALIBRATION]: {
    buttonText: DECK_CAL_BUTTON_TEXT,
    headerText: BASE_HEADER,
  },
  [Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION]: {
    buttonText: PIP_OFFSET_BUTTON_TEXT,
    headerText: `${CALIBRATE} ${BASE_HEADER}`,
  },
  [Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK]: {
    buttonText: CALIBRATION_HEALTH_BUTTON_TEXT,
    headerText: `${CHECK} ${BASE_HEADER}`,
  },
}

export function SaveZPoint(props: CalibrationPanelProps): React.Node {
  const { isMulti, mount, sendCommands, sessionType } = props

  const { headerText, buttonText } = contentsBySessionType[sessionType]

  const demoAsset = React.useMemo(
    () => mount && assetMap[mount][isMulti ? 'multi' : 'single'],
    [mount, isMulti]
  )

  const jog = (axis: JogAxis, dir: JogDirection, step: JogStep) => {
    sendCommands({
      command: Sessions.sharedCalCommands.JOG,
      data: {
        vector: formatJogVector(axis, dir, step),
      },
    })
  }

  const continueCommands = () => {
    if (sessionType === Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK) {
      return () => {
        sendCommands(
          { command: Sessions.checkCommands.COMPARE_POINT },
          { command: Sessions.sharedCalCommands.MOVE_TO_POINT_ONE }
        )
      }
    } else {
      return () => {
        sendCommands(
          { command: Sessions.sharedCalCommands.SAVE_OFFSET },
          { command: Sessions.sharedCalCommands.MOVE_TO_POINT_ONE }
        )
      }
    }
  }

  const [confirmLink, confirmModal] = useConfirmCrashRecovery({
    requiresNewTip: true,
    ...props,
  })

  return (
    <>
      <Text
        textTransform={TEXT_TRANSFORM_UPPERCASE}
        fontWeight={FONT_WEIGHT_SEMIBOLD}
        fontSize={FONT_SIZE_HEADER}
      >
        {headerText}
      </Text>
      <Flex
        flexDirection={DIRECTION_ROW}
        padding={SPACING_3}
        border={BORDER_SOLID_LIGHT}
        marginTop={SPACING_3}
      >
        <Text fontSize={FONT_SIZE_BODY_2} alignSelf={ALIGN_CENTER}>
          {JOG_UNTIL}
          <b>{` ${JUST_BARELY_TOUCHING} `}</b>
          {DECK_IN}
          <b>{` ${TARGET_SLOT}`}.</b>
          <br />
          <br />
          {THEN}
          <b>{` ${buttonText} `}</b>
          {TO_USE_Z}.
        </Text>
        <video
          key={demoAsset}
          css={css`
            max-width: 100%;
            max-height: 15rem;
          `}
          autoPlay={true}
          loop={true}
          controls={false}
        >
          <source src={demoAsset} />
        </video>
      </Flex>
      <JogControls jog={jog} stepSizes={[0.1, 1]} axes={['z']} />
      <Flex
        width="100%"
        marginBottom={SPACING_3}
        justifyContent={JUSTIFY_CENTER}
      >
        <PrimaryBtn
          title="save"
          onClick={continueCommands()}
          flex="1"
          marginX={SPACING_5}
        >
          {buttonText}
        </PrimaryBtn>
      </Flex>
      <Box width="100%">{confirmLink}</Box>
      {confirmModal}
    </>
  )
}
