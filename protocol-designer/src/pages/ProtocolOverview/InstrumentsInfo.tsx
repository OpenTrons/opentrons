import { useTranslation } from 'react-i18next'

import {
  Flex,
  StyledText,
  Btn,
  DIRECTION_COLUMN,
  SPACING,
  JUSTIFY_SPACE_BETWEEN,
  TYPOGRAPHY,
  ListItem,
  ListItemDescriptor,
} from '@opentrons/components'
import { getPipetteSpecsV2, FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { BUTTON_LINK_STYLE } from '../../atoms'

import type { PipetteName, RobotType } from '@opentrons/shared-data'
import type { AdditionalEquipmentEntities } from '@opentrons/step-generation'
import type { PipetteOnDeck } from '../../step-forms'

interface InstrumentsInfoProps {
  robotType: RobotType
  pipettesOnDeck: PipetteOnDeck[]
  additionalEquipment: AdditionalEquipmentEntities
  setShowEditInstrumentsModal: (showEditInstrumentsModal: boolean) => void
}

export function InstrumentsInfo({
  robotType,
  pipettesOnDeck,
  additionalEquipment,
  setShowEditInstrumentsModal,
}: InstrumentsInfoProps): JSX.Element {
  const { t } = useTranslation(['protocol_overview', 'shared'])
  const leftPipette = pipettesOnDeck.find(pipette => pipette.mount === 'left')
  const rightPipette = pipettesOnDeck.find(pipette => pipette.mount === 'right')
  const isGripperAttached = Object.values(additionalEquipment).some(
    equipment => equipment?.name === 'gripper'
  )

  const pipetteInfo = (pipette?: PipetteOnDeck): JSX.Element | string => {
    const pipetteName =
      pipette != null
        ? getPipetteSpecsV2(pipette.name as PipetteName)?.displayName
        : t('na')
    const tipsInfo = pipette?.tiprackLabwareDef
      ? pipette.tiprackLabwareDef.map(labware => labware.metadata.displayName)
      : t('na')

    if (pipetteName === t('na') || tipsInfo === t('na')) {
      return t('na')
    }

    return (
      <Flex flexDirection={DIRECTION_COLUMN}>
        <StyledText desktopStyle="bodyDefaultRegular">{pipetteName}</StyledText>
        {pipette != null && pipette.tiprackLabwareDef.length > 0
          ? pipette?.tiprackLabwareDef.map(labware => (
              <StyledText
                key={labware.metadata.displayName}
                desktopStyle="bodyDefaultRegular"
              >
                {labware.metadata.displayName}
              </StyledText>
            ))
          : null}
      </Flex>
    )
  }

  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
      <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
        <StyledText desktopStyle="headingSmallBold">
          {t('instruments')}
        </StyledText>
        <Flex padding={SPACING.spacing4}>
          <Btn
            textDecoration={TYPOGRAPHY.textDecorationUnderline}
            onClick={() => {
              setShowEditInstrumentsModal(true)
            }}
            css={BUTTON_LINK_STYLE}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('edit')}
            </StyledText>
          </Btn>
        </Flex>
      </Flex>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <ListItem type="noActive" key={`ProtocolOverview_robotType`}>
          <ListItemDescriptor
            type="default"
            description={t('robotType')}
            content={
              robotType === FLEX_ROBOT_TYPE
                ? t('shared:opentrons_flex')
                : t('shared:ot2')
            }
          />
        </ListItem>
        <ListItem type="noActive" key={`ProtocolOverview_left`}>
          <ListItemDescriptor
            type="default"
            description={t('left_pip')}
            content={pipetteInfo(leftPipette)}
          />
        </ListItem>
        <ListItem type="noActive" key={`ProtocolOverview_right`}>
          <ListItemDescriptor
            type="default"
            description={t('right_pip')}
            content={pipetteInfo(rightPipette)}
          />
        </ListItem>
        {robotType === FLEX_ROBOT_TYPE ? (
          <ListItem type="noActive" key={`ProtocolOverview_gripper`}>
            <ListItemDescriptor
              type="default"
              description={t('extension')}
              content={isGripperAttached ? t('gripper') : t('na')}
            />
          </ListItem>
        ) : null}
      </Flex>
    </Flex>
  )
}
