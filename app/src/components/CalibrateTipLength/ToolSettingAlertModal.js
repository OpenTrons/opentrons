// @flow
import * as React from 'react'
import {
  AlertModal,
  Box,
  CheckboxField,
  Link,
  FONT_SIZE_BODY_1,
  FONT_SIZE_BODY_2,
  SPACING_3,
  Flex,
  Text,
  JUSTIFY_SPACE_BETWEEN,
  SecondaryBtn,
  DIRECTION_ROW,
} from '@opentrons/components'

import styles from './styles.css'
import type { CalibrateTipLengthChildProps } from './types'
import { calBlockImage } from './labwareImages'
import { Portal } from '../portal'

const ALERT_TIP_LENGTH_CAL_HEADER = 'Pipette calibration has been updated!'
const ALERT_TIP_LENGTH_CAL_BODY =
  'The Tip Probe feature of the robot is no longer being used. We’ve replaced it with a new process that allows the robot to measure the length of a tip relative to how it fits on the nozzle of the pipette. The data is saved per pipette model, so that each pipette model can save unique tip length data.'
const PREREQS = 'To perform this new calibration process, you will require a'
const CALIBRATION_BLOCK = 'Calibration Block.'
const IF_NO_BLOCK = 'If you do not have a Calibration Block please'
const CONTACT_US = 'contact us'
const TO_RECEIVE = 'to receive one.'
const ALTERNATIVE =
  'While you wait for the block to arrive, you may opt in to using the flat surface on the Trash Bin of your robot instead.'
const HAVE_BLOCK = 'I have a calibration block'
const USE_TRASH = 'Use trash bin for now'
const REMEMBER = "Remember my selection and don't ask again"
const CAN_CHANGE =
  '(You can change this selection under More > Robots > Advanced Settings)'
const SUPPORT_URL = 'https://www.opentrons.com/contact-support'

const NOTE_SPACING = '1.75rem'

export function ToolSettingAlertModal(
  props: CalibrateTipLengthChildProps
): React.Node {
  return (
    <Portal>
      <AlertModal
        className={styles.alert_modal_padding}
        iconName={null}
        heading={ALERT_TIP_LENGTH_CAL_HEADER}
        alertOverlay
      >
        <Box fontSize={FONT_SIZE_BODY_2}>
          <Text marginBottom={SPACING_3}>{ALERT_TIP_LENGTH_CAL_BODY}</Text>
          <Flex width="100%" flexDirection={DIRECTION_ROW}>
            <div>
              <Text marginBottom={SPACING_3}>
                {PREREQS}
                &nbsp;
                <b>{CALIBRATION_BLOCK}</b>
              </Text>
              <Text marginBottom={SPACING_3}>
                {IF_NO_BLOCK}
                &nbsp;
                <Link href={SUPPORT_URL} external>
                  {CONTACT_US}
                </Link>
                &nbsp;
                {TO_RECEIVE}
              </Text>
              <Text marginBottom={SPACING_3}>{ALTERNATIVE}</Text>
            </div>
            <div>
              <img className={styles.block_image} src={calBlockImage} />
            </div>
          </Flex>
        </Box>
        <Flex marginY={SPACING_3} justifyContent={JUSTIFY_SPACE_BETWEEN}>
          <SecondaryBtn onClick={() => console.log('TODO: handle use block')}>
            {HAVE_BLOCK}
          </SecondaryBtn>
          <SecondaryBtn
            onClick={() => console.log('TODO: handle use trash edge')}
          >
            {USE_TRASH}
          </SecondaryBtn>
        </Flex>
        <div>
          <CheckboxField
            label={REMEMBER}
            onChange={() => console.log('TODO: save block setting')}
          />
          <Text fontSize={FONT_SIZE_BODY_1} paddingX={NOTE_SPACING}>
            {CAN_CHANGE}
          </Text>
        </div>
      </AlertModal>
    </Portal>
  )
}
