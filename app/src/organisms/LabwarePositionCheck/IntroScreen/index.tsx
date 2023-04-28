import * as React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CompletedProtocolAnalysis } from '@opentrons/shared-data'
import { StyledText } from '../../../atoms/text'
import { RobotMotionLoader } from '../RobotMotionLoader'
import { getPrepCommands } from './getPrepCommands'
import { useChainRunCommands } from '../../../resources/runs/hooks'
import type { RegisterPositionAction } from '../types'
import type { Jog } from '../../../molecules/JogControls'
import { WizardRequiredEquipmentList } from '../../../molecules/WizardRequiredEquipmentList'
import { GenericWizardTile } from '../../../molecules/GenericWizardTile'
import { getIsOnDevice } from '../../../redux/config'
import { useSelector } from 'react-redux'

export const INTERVAL_MS = 3000
const SUPPORT_PAGE_URL = 'https://support.opentrons.com/s/ot2-calibration'

export const IntroScreen = (props: {
  proceed: () => void
  protocolData: CompletedProtocolAnalysis
  registerPosition: React.Dispatch<RegisterPositionAction>
  chainRunCommands: ReturnType<typeof useChainRunCommands>['chainRunCommands']
  handleJog: Jog
  setFatalError: (errorMessage: string) => void
  isRobotMoving: boolean
}): JSX.Element | null => {
  const {
    proceed,
    protocolData,
    chainRunCommands,
    isRobotMoving,
    setFatalError,
  } = props
  const isOnDevice = useSelector(getIsOnDevice)
  const { t } = useTranslation(['labware_position_check', 'shared'])
  const handleClickStartLPC = (): void => {
    const prepCommands = getPrepCommands(protocolData)
    chainRunCommands(prepCommands, false)
      .then(() => proceed())
      .catch((e: Error) => {
        setFatalError(
          `IntroScreen failed to issue prep commands with message: ${e.message}`
        )
      })
  }

  if (isRobotMoving) {
    return (
      <RobotMotionLoader header={t('shared:stand_back_robot_is_in_motion')} />
    )
  }
  return (
    <GenericWizardTile
      header={t('shared:before_you_begin')}
      getHelp={isOnDevice ? undefined : SUPPORT_PAGE_URL}
      bodyText={
        <Trans
          t={t}
          i18nKey="labware_position_check_description"
          components={{ block: <StyledText as="p" /> }}
        />
      }
      rightHandBody={
        <WizardRequiredEquipmentList
          equipmentList={[
            {
              loadName: t('all_modules_and_labware_from_protocol'),
              displayName: t('all_modules_and_labware_from_protocol'),
            },
          ]}
        />
      }
      proceedButtonText={t('shared:get_started')}
      proceed={handleClickStartLPC}
    />
  )

  // (

  //   <Flex
  //     flexDirection={DIRECTION_COLUMN}
  //     justifyContent={JUSTIFY_SPACE_BETWEEN}
  //     padding={SPACING.spacing6}
  //     minHeight="29.5rem"
  //   >
  //     <Flex gridGap={SPACING.spacingXXL}>
  //       <Flex
  //         flex="1"
  //         flexDirection={DIRECTION_COLUMN}
  //         gridGap={SPACING.spacing3}
  //       >
  //         <StyledText as="h1" marginBottom={SPACING.spacing4}>
  //           {t('shared:before_you_begin')}
  //         </StyledText>
  //         <Trans
  //           t={t}
  //           i18nKey="labware_position_check_description"
  //           components={{ block: <StyledText as="p" /> }}
  //         />
  //       </Flex>
  //       <Flex
  //         flex="1"
  //         flexDirection={DIRECTION_COLUMN}
  //         gridGap={SPACING.spacing3}
  //       >
  //         <WizardRequiredEquipmentList equipmentList={[
  //           {
  //             loadName: t('all_modules_and_labware_from_protocol'),
  //             displayName: t('all_modules_and_labware_from_protocol')
  //           }
  //         ]} />
  //       </Flex>
  //     </Flex>
  //     <Flex
  //       width="100%"
  //       marginTop={SPACING.spacing6}
  //       justifyContent={JUSTIFY_SPACE_BETWEEN}
  //       alignItems={ALIGN_CENTER}
  //     >
  //       <NeedHelpLink />
  //       <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing3}>
  //         <PrimaryButton onClick={handleClickStartLPC}>
  //           {t('shared:get_started')}
  //         </PrimaryButton>
  //       </Flex>
  //     </Flex>
  //   </Flex>
  // )
}
