import * as React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { getLabwareDisplayName } from '@opentrons/shared-data'
import {
  Flex,
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
} from '@opentrons/components'

import * as Sessions from '../../../redux/sessions'
import { StyledText } from '../../../atoms/text'
import { Banner } from '../../../atoms/Banner'
import { PrimaryButton, SecondaryButton } from '../../../atoms/buttons'
import { NeedHelpLink } from '../NeedHelpLink'
import { ChooseTipRack } from '../ChooseTipRack'

import {
  INTENT_TIP_LENGTH_OUTSIDE_PROTOCOL,
  INTENT_TIP_LENGTH_IN_PROTOCOL,
  INTENT_CALIBRATE_PIPETTE_OFFSET,
  INTENT_RECALIBRATE_PIPETTE_OFFSET,
  TRASH_BIN_LOAD_NAME,
} from '../constants'
import { WizardRequiredLabwareList } from '../../../molecules/WizardRequiredLabwareList'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { SessionType } from '../../../redux/sessions/types'
import type { CalibrationPanelProps, Intent } from '../types'
import {
  SESSION_TYPE_DECK_CALIBRATION,
  SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION,
} from '../../../redux/sessions'

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
    value && setChosenTipRack(value)
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
  if (calBlock) {
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
    isExtendedPipOffset
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
      supportedCommands &&
      supportedCommands.includes(Sessions.sharedCalCommands.LOAD_LABWARE)
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
          <IntroHeader
            sessionType={sessionType}
            isExtendedPipOffset={isExtendedPipOffset}
            intent={intent}
          />

          {sessionType === Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION &&
          isExtendedPipOffset === true ? (
            <InvalidationStatement intent={intent} />
          ) : null}
          <IntroBody
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
          {sessionType === SESSION_TYPE_DECK_CALIBRATION ||
          (sessionType === SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION &&
            isExtendedPipOffset &&
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

interface IntroHeaderProps {
  sessionType: SessionType
  isExtendedPipOffset?: boolean | null
  intent?: Intent
}
function IntroHeader(props: IntroHeaderProps): JSX.Element {
  const { sessionType, isExtendedPipOffset, intent } = props
  const { t } = useTranslation('robot_calibration')
  let headerText = null
  switch (sessionType) {
    case Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK:
      headerText = t('calibration_health_check')
      break
    case Sessions.SESSION_TYPE_DECK_CALIBRATION:
      headerText = t('deck_calibration')
      break
    case Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION:
      if (isExtendedPipOffset && intent != null) {
        headerText = t('tip_length_and_pipette_offset_calibration')
      } else {
        headerText = t('pipette_offset_calibration')
      }
      break
    case Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION:
      headerText = t('tip_length_calibration')
      break
  }
  return <StyledText as="h3">{headerText}</StyledText>
}

interface IntroBodyProps {
  sessionType: SessionType
  isExtendedPipOffset?: boolean | null
}
function IntroBody(props: IntroBodyProps): JSX.Element | null {
  const { sessionType, isExtendedPipOffset } = props
  const { t } = useTranslation('robot_calibration')
  switch (sessionType) {
    case Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK:
      return (
        <Trans
          t={t}
          i18nKey="calibration_health_check_intro_body"
          components={{ block: <StyledText as="p" /> }}
        />
      )
    case Sessions.SESSION_TYPE_DECK_CALIBRATION:
      return <StyledText as="p">{t('deck_calibration_intro_body')}</StyledText>
    case Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION:
      return isExtendedPipOffset ? (
        <>
          <StyledText as="p">
            {t('tip_length_calibration_intro_body')}
          </StyledText>
          <StyledText as="p">
            {t('pipette_offset_calibration_intro_body')}
          </StyledText>
        </>
      ) : (
        <StyledText as="p">
          {t('pipette_offset_calibration_intro_body')}
        </StyledText>
      )
    case Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION:
      return (
        <StyledText as="p">{t('tip_length_calibration_intro_body')}</StyledText>
      )
    default:
      // this case should never be reached
      console.warn(
        'Introduction Calibration Panel received invalid session type'
      )
      return null
  }
}

interface InvalidationStatementProps {
  intent?: Intent
}
function InvalidationStatement(
  props: InvalidationStatementProps
): JSX.Element | null {
  const { intent } = props
  const { t } = useTranslation('robot_calibration')
  if (
    intent === INTENT_TIP_LENGTH_IN_PROTOCOL ||
    intent === INTENT_TIP_LENGTH_OUTSIDE_PROTOCOL
  ) {
    return (
      <Banner type="warning">
        {t('tip_length_invalidates_pipette_offset')}
      </Banner>
    )
  } else if (
    intent === INTENT_CALIBRATE_PIPETTE_OFFSET ||
    intent === INTENT_RECALIBRATE_PIPETTE_OFFSET
  ) {
    return (
      <Banner type="warning">{t('pipette_offset_requires_tip_length')}</Banner>
    )
  } else {
    return null
  }
}
