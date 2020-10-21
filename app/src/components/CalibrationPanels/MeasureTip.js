// @flow
import * as React from 'react'
import { css } from 'styled-components'
import {
  Box,
  Flex,
  PrimaryBtn,
  Text,
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  JUSTIFY_CENTER,
  BORDER_SOLID_LIGHT,
  DIRECTION_COLUMN,
  FONT_SIZE_BODY_2,
  POSITION_RELATIVE,
  TEXT_TRANSFORM_UPPERCASE,
  FONT_WEIGHT_SEMIBOLD,
  FONT_SIZE_HEADER,
  SPACING_2,
  SPACING_3,
  SPACING_4,
} from '@opentrons/components'

import * as Sessions from '../../sessions'
import { JogControls } from '../JogControls'
import type { JogAxis, JogDirection, JogStep } from '../../http-api-client'
import type { CalibrationPanelProps } from '../CalibrationPanels/types'
import { useConfirmCrashRecovery } from './useConfirmCrashRecovery'
import { formatJogVector } from '../CalibrationPanels/utils'
import leftMultiBlockAsset from '../../assets/videos/tip-length-cal/Left_Multi_CalBlock_WITH_TIP_(330x260)REV1.webm'
import leftMultiTrashAsset from '../../assets/videos/tip-length-cal/Left_Multi_Trash_WITH_TIP_(330x260)REV1.webm'
import leftSingleBlockAsset from '../../assets/videos/tip-length-cal/Left_Single_CalBlock_WITH_TIP_(330x260)REV1.webm'
import leftSingleTrashAsset from '../../assets/videos/tip-length-cal/Left_Single_Trash_WITH_TIP_(330x260)REV1.webm'
import rightMultiBlockAsset from '../../assets/videos/tip-length-cal/Right_Multi_CalBlock_WITH_TIP_(330x260)REV1.webm'
import rightMultiTrashAsset from '../../assets/videos/tip-length-cal/Right_Multi_Trash_WITH_TIP_(330x260)REV1.webm'
import rightSingleBlockAsset from '../../assets/videos/tip-length-cal/Right_Single_CalBlock_WITH_TIP_(330x260)REV1.webm'
import rightSingleTrashAsset from '../../assets/videos/tip-length-cal/Right_Single_Trash_WITH_TIP_(330x260)REV1.webm'

const assetMap = {
  block: {
    left: {
      multi: leftMultiBlockAsset,
      single: leftSingleBlockAsset,
    },
    right: {
      multi: rightMultiBlockAsset,
      single: rightSingleBlockAsset,
    },
  },
  trash: {
    left: {
      multi: leftMultiTrashAsset,
      single: leftSingleTrashAsset,
    },
    right: {
      multi: rightMultiTrashAsset,
      single: rightSingleTrashAsset,
    },
  },
}

const HEADER = 'Save the tip length'
const JOG_UNTIL = 'Jog the robot until the tip is'
const BARELY_TOUCHING = 'barely touching (less than 0.1 mm)'
const THE = 'the'
const BLOCK = 'block in'
const FLAT_SURFACE = 'flat surface'
const OF_THE_TRASH_BIN = 'of the trash bin'
const SAVE_NOZZLE_Z_AXIS = 'Save the tip length'
const SLOT = 'slot'

export function MeasureTip(props: CalibrationPanelProps): React.Node {
  const {
    sendCommands,
    calBlock,
    isMulti,
    mount,
    shouldPerformTipLength,
    sessionType,
  } = props

  const referencePointStr = calBlock ? (
    BLOCK
  ) : (
    <Text as="strong">{`${FLAT_SURFACE} `}</Text>
  )
  const referenceSlotStr = calBlock ? (
    <Text as="strong">{` ${SLOT} ${calBlock.slot}`}</Text>
  ) : (
    OF_THE_TRASH_BIN
  )

  const demoAsset = React.useMemo(
    () =>
      mount &&
      assetMap[calBlock ? 'block' : 'trash'][mount][
        isMulti ? 'multi' : 'single'
      ],
    [mount, isMulti, calBlock]
  )

  const jog = (axis: JogAxis, dir: JogDirection, step: JogStep) => {
    sendCommands({
      command: Sessions.sharedCalCommands.JOG,
      data: {
        vector: formatJogVector(axis, dir, step),
      },
    })
  }

  const isExtendedPipOffset =
    sessionType === Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION &&
    shouldPerformTipLength

  const proceedTipLength = () => {
    sendCommands(
      { command: Sessions.sharedCalCommands.SAVE_OFFSET },
      { command: Sessions.sharedCalCommands.MOVE_TO_TIP_RACK }
    )
  }

  const proceedPipetteOffset = () => {
    sendCommands({ command: Sessions.sharedCalCommands.SAVE_OFFSET })
  }

  const proceed = isExtendedPipOffset ? proceedPipetteOffset : proceedTipLength
  const [confirmLink, confirmModal] = useConfirmCrashRecovery({
    requiresNewTip: true,
    ...props,
  })

  return (
    <>
      <Flex
        marginY={SPACING_2}
        flexDirection={DIRECTION_COLUMN}
        alignItems={ALIGN_FLEX_START}
        position={POSITION_RELATIVE}
        width="100%"
      >
        <Text
          textTransform={TEXT_TRANSFORM_UPPERCASE}
          fontWeight={FONT_WEIGHT_SEMIBOLD}
          fontSize={FONT_SIZE_HEADER}
        >
          {HEADER}
        </Text>
        <Box
          paddingX={SPACING_3}
          paddingY={SPACING_4}
          border={BORDER_SOLID_LIGHT}
          borderWidth="2px"
          width="100%"
        >
          <Flex alignItems={ALIGN_CENTER} width="100%">
            <Text width="49%" fontSize={FONT_SIZE_BODY_2}>
              {JOG_UNTIL}
              <Text as="strong">{` ${BARELY_TOUCHING} `}</Text>
              {`${THE} `}
              {referencePointStr}
              {referenceSlotStr}
              {`.`}
            </Text>
            <Box marginLeft={SPACING_3}>
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
            </Box>
          </Flex>
        </Box>
        <div>
          <JogControls jog={jog} stepSizes={[0.1, 1]} axes={['z']} />
        </div>
        <Flex width="100%" justifyContent={JUSTIFY_CENTER} marginY={SPACING_3}>
          <PrimaryBtn title="saveTipLengthButton" onClick={proceed} flex="1">
            {SAVE_NOZZLE_Z_AXIS}
          </PrimaryBtn>
        </Flex>
      </Flex>
      <Box width="100%">{confirmLink}</Box>
      {confirmModal}
    </>
  )
}
