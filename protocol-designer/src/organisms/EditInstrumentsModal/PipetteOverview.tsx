import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import mapValues from 'lodash/mapValues'

import {
  ALIGN_CENTER,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  EmptySelectorButton,
  FLEX_MAX_CONTENT,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  ListItem,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { PipetteInfoItem } from '../PipetteInfoItem'
import { changeSavedStepForm } from '../../steplist/actions'
import { deletePipettes } from '../../step-forms/actions'
import { deleteContainer } from '../../labware-ingred/actions'
import { toggleIsGripperRequired } from '../../step-forms/actions/additionalItems'
import { getSectionsFromPipetteName } from './utils'
import { INITIAL_DECK_SETUP_STEP_ID } from '../../constants'
import { LINK_BUTTON_STYLE } from '../../components/atoms'

import type { AdditionalEquipmentName } from '@opentrons/step-generation'
import type { RobotType } from '@opentrons/shared-data'
import type {
  AllTemporalPropertiesForTimelineFrame,
  PipetteOnDeck,
} from '../../step-forms'
import type { ThunkDispatch } from '../../types'
import type { PipetteConfig } from './usePipetteConfig'
import { getAdditionalEquipmentEntities } from '../../step-forms/selectors'

interface Gripper {
  name: AdditionalEquipmentName
  id: string
  location?: string
}

interface PipetteOverviewProps {
  has96Channel: boolean
  pipettes: AllTemporalPropertiesForTimelineFrame['pipettes']
  labware: AllTemporalPropertiesForTimelineFrame['labware']
  robotType: RobotType
  pipetteConfig: PipetteConfig
  leftPipette?: PipetteOnDeck
  rightPipette?: PipetteOnDeck
  gripper?: Gripper
}

export function PipetteOverview({
  has96Channel,
  pipettes,
  labware,
  robotType,
  pipetteConfig,
  leftPipette,
  rightPipette,
  gripper,
}: PipetteOverviewProps): JSX.Element {
  const { t } = useTranslation(['create_new_protocol', 'protocol_overview'])
  const dispatch = useDispatch<ThunkDispatch<any>>()
  const additionalEquipmentEntities = useSelector(
    getAdditionalEquipmentEntities
  )
  const gripperId = Object.values(additionalEquipmentEntities).find(
    ae => ae.name === 'gripper'
  )?.id

  const swapPipetteUpdate = mapValues(pipettes, pipette => {
    if (!pipette.mount) return pipette.mount
    return pipette.mount === 'left' ? 'right' : 'left'
  })

  const targetPipetteMount = leftPipette == null ? 'left' : 'right'

  const rightInfo =
    rightPipette != null
      ? getSectionsFromPipetteName(rightPipette.name, rightPipette.spec)
      : null
  const leftInfo =
    leftPipette != null
      ? getSectionsFromPipetteName(leftPipette.name, leftPipette.spec)
      : null

  const previousLeftPipetteTipracks = Object.values(labware)
    .filter(lw => lw.def.parameters.isTiprack)
    .filter(tip => leftPipette?.tiprackDefURI.includes(tip.labwareDefURI))
  const previousRightPipetteTipracks = Object.values(labware)
    .filter(lw => lw.def.parameters.isTiprack)
    .filter(tip => rightPipette?.tiprackDefURI.includes(tip.labwareDefURI))

  const {
    setPage,
    setMount,
    setPipetteType,
    setPipetteGen,
    setPipetteVolume,
    setSelectedTips,
  } = pipetteConfig

  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing24}>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
        <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} alignItems={ALIGN_CENTER}>
          <StyledText desktopStyle="bodyLargeSemiBold">
            {t('your_pipettes')}
          </StyledText>
          {has96Channel ||
          (leftPipette == null && rightPipette == null) ? null : (
            <Btn
              css={LINK_BUTTON_STYLE}
              onClick={() =>
                dispatch(
                  changeSavedStepForm({
                    stepId: INITIAL_DECK_SETUP_STEP_ID,
                    update: {
                      pipetteLocationUpdate: swapPipetteUpdate,
                    },
                  })
                )
              }
            >
              <Flex flexDirection={DIRECTION_ROW}>
                <Icon
                  name="swap-horizontal"
                  size="1rem"
                  transform="rotate(90deg)"
                />
                <StyledText desktopStyle="captionSemiBold">
                  {t('swap_pipette_mounts')}
                </StyledText>
              </Flex>
            </Btn>
          )}
        </Flex>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          {leftPipette?.tiprackDefURI != null && leftInfo != null ? (
            <PipetteInfoItem
              mount="left"
              pipetteName={leftPipette.name}
              tiprackDefURIs={leftPipette.tiprackDefURI}
              editClick={() => {
                setPage('add')
                setMount('left')
                setPipetteType(leftInfo.type)
                setPipetteGen(leftInfo.gen)
                setPipetteVolume(leftInfo.volume)
                setSelectedTips(leftPipette.tiprackDefURI as string[])
              }}
              cleanForm={() => {
                dispatch(deletePipettes([leftPipette.id as string]))
                previousLeftPipetteTipracks.forEach(tip =>
                  dispatch(deleteContainer({ labwareId: tip.id }))
                )
              }}
            />
          ) : null}
          {rightPipette?.tiprackDefURI != null && rightInfo != null ? (
            <PipetteInfoItem
              mount="right"
              pipetteName={rightPipette.name}
              tiprackDefURIs={rightPipette.tiprackDefURI}
              editClick={() => {
                setPage('add')
                setMount('right')
                setPipetteType(rightInfo.type)
                setPipetteGen(rightInfo.gen)
                setPipetteVolume(rightInfo.volume)
                setSelectedTips(rightPipette.tiprackDefURI as string[])
              }}
              cleanForm={() => {
                dispatch(deletePipettes([rightPipette.id as string]))
                previousRightPipetteTipracks.forEach(tip =>
                  dispatch(deleteContainer({ labwareId: tip.id }))
                )
              }}
            />
          ) : null}
          {has96Channel ||
          (leftPipette != null && rightPipette != null) ? null : (
            <Flex width={FLEX_MAX_CONTENT}>
              <EmptySelectorButton
                onClick={() => {
                  setPage('add')
                  setMount(targetPipetteMount)
                }}
                text={t('add_pipette')}
                textAlignment="left"
                iconName="plus"
              />
            </Flex>
          )}
        </Flex>
      </Flex>
      {robotType === FLEX_ROBOT_TYPE ? (
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          <Flex
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            alignItems={ALIGN_CENTER}
          >
            <StyledText desktopStyle="bodyLargeSemiBold">
              {t('protocol_overview:your_gripper')}
            </StyledText>
          </Flex>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
            {gripper != null ? (
              <ListItem type="default">
                <Flex
                  padding={SPACING.spacing12}
                  justifyContent={JUSTIFY_SPACE_BETWEEN}
                  width="100%"
                >
                  <Flex
                    gridGap={SPACING.spacing4}
                    flexDirection={DIRECTION_COLUMN}
                  >
                    <StyledText desktopStyle="bodyDefaultSemiBold">
                      {t('protocol_overview:extension')}
                    </StyledText>
                    <StyledText
                      desktopStyle="bodyDefaultRegular"
                      color={COLORS.grey60}
                    >
                      {t('protocol_overview:gripper')}
                    </StyledText>
                  </Flex>
                  <Btn
                    css={LINK_BUTTON_STYLE}
                    textDecoration={TYPOGRAPHY.textDecorationUnderline}
                    padding={SPACING.spacing4}
                    onClick={() => {
                      dispatch(toggleIsGripperRequired(gripperId))
                    }}
                  >
                    <StyledText desktopStyle="bodyDefaultRegular">
                      {t('remove')}
                    </StyledText>
                  </Btn>
                </Flex>
              </ListItem>
            ) : (
              <Flex width={FLEX_MAX_CONTENT}>
                <EmptySelectorButton
                  onClick={() => {
                    dispatch(toggleIsGripperRequired())
                  }}
                  text={t('protocol_overview:add_gripper')}
                  textAlignment="left"
                  iconName="plus"
                />
              </Flex>
            )}
          </Flex>
        </Flex>
      ) : null}
    </Flex>
  )
}
