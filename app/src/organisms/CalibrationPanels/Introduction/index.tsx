import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { getLabwareDisplayName } from '@opentrons/shared-data'
import {
  Flex,
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
} from '@opentrons/components'

import * as Sessions from '../../../redux/sessions'
import { PrimaryButton, SecondaryButton } from '../../../atoms/buttons'
import { NeedHelpLink } from '../NeedHelpLink'
import { ChooseTipRack } from '../ChooseTipRack'

import {
  INTENT_TIP_LENGTH_IN_PROTOCOL,
  TRASH_BIN_LOAD_NAME,
} from '../constants'
import { WizardRequiredLabwareList } from '../../../molecules/WizardRequiredLabwareList'
import { Header } from './Header'
import { Body } from './Body'
import { InvalidationWarning } from './InvalidationWarning'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { CalibrationPanelProps } from '../types'

const TRASH_BIN = 'Removable black plastic trash bin'

export function Introduction(props: CalibrationPanelProps): JSX.Element {
  const {
    tipRack,
    calBlock,
    sendCommands,
    sessionType,
    shouldPerformTipLength,
    intent,
    instruments,
    supportedCommands,
  } = props
  const { t } = useTranslation('robot_calibration')

  const [showChooseTipRack, setShowChooseTipRack] = React.useState(false)
  const [
    chosenTipRack,
    setChosenTipRack,
  ] = React.useState<LabwareDefinition2 | null>(null)

  const handleChosenTipRack = (value: LabwareDefinition2 | null): void => {
    value != null && setChosenTipRack(value)
  }
  const isExtendedPipOffset: boolean | null | undefined =
    sessionType === Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION &&
    shouldPerformTipLength
  const uniqueTipRacks = new Set(
    instruments?.map(instr => instr.tipRackLoadName)
  )

  let equipmentList: Array<{ loadName: string; displayName: string }> =
    uniqueTipRacks.size > 1
      ? instruments?.map(instr => ({
          loadName: instr.tipRackLoadName,
          displayName: instr.tipRackDisplay,
        })) ?? []
      : [
          {
            loadName: tipRack.loadName,
            displayName: getLabwareDisplayName(tipRack.definition),
          },
        ]

  if (chosenTipRack != null) {
    equipmentList = [
      {
        loadName: chosenTipRack.parameters.loadName,
        displayName: chosenTipRack.metadata.displayName,
      },
    ]
  }
  if (calBlock != null) {
    equipmentList = [
      ...equipmentList,
      {
        loadName: calBlock.loadName,
        displayName: getLabwareDisplayName(calBlock.definition),
      },
    ]
  } else if (
    sessionType === Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK ||
    sessionType === Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION ||
    isExtendedPipOffset === true
  ) {
    equipmentList = [
      ...equipmentList,
      {
        loadName: TRASH_BIN_LOAD_NAME,
        displayName: TRASH_BIN,
      },
    ]
  }

  const proceed = (): void => {
    if (
      supportedCommands?.includes(Sessions.sharedCalCommands.LOAD_LABWARE) ?? false
    ) {
      sendCommands({
        command: Sessions.sharedCalCommands.LOAD_LABWARE,
        data: { tiprackDefinition: chosenTipRack ?? tipRack.definition },
      })
    } else {
      sendCommands({ command: Sessions.sharedCalCommands.LOAD_LABWARE })
    }
  }

  return showChooseTipRack ? (
    <ChooseTipRack
      tipRack={props.tipRack}
      mount={props.mount}
      sessionType={props.sessionType}
      chosenTipRack={chosenTipRack}
      handleChosenTipRack={handleChosenTipRack}
      closeModal={() => setShowChooseTipRack(false)}
      robotName={props.robotName}
      defaultTipracks={props.defaultTipracks}
    />
  ) : (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <Flex>
        <Flex
          width="100%"
          flexDirection={DIRECTION_COLUMN}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
        >
          <Header
            sessionType={sessionType}
            isExtendedPipOffset={isExtendedPipOffset}
            intent={intent}
          />

          {sessionType === Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION &&
          isExtendedPipOffset === true ? (
            <InvalidationWarning intent={intent} />
          ) : null}
          <Body
            sessionType={sessionType}
            isExtendedPipOffset={isExtendedPipOffset}
          />
        </Flex>
        <WizardRequiredLabwareList
          equipmentList={equipmentList}
          footer={
            sessionType === Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK
              ? t('this_is_the_tip_used_in_pipette_offset_cal')
              : t('important_to_use_listed_equipment')
          }
        />
      </Flex>
      <Flex
        width="100%"
        marginTop={SPACING.spacing6}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
      >
        <NeedHelpLink />
        <Flex>
          {sessionType === Sessions.SESSION_TYPE_DECK_CALIBRATION ||
          (sessionType === Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION &&
            isExtendedPipOffset === true &&
            intent !== INTENT_TIP_LENGTH_IN_PROTOCOL) ? (
            <SecondaryButton onClick={() => setShowChooseTipRack(true)}>
              {t('change_tip_rack')}
            </SecondaryButton>
          ) : null}
          <PrimaryButton onClick={proceed}>{t('get_started')}</PrimaryButton>
        </Flex>
      </Flex>
    </Flex>
  )
}
