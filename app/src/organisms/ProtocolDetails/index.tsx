import * as React from 'react'
import map from 'lodash/map'
import { format } from 'date-fns'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  Box,
  Btn,
  Flex,
  DIRECTION_ROW,
  SPACING,
  TYPOGRAPHY,
  COLORS,
  BORDERS,
  SIZE_1,
  DIRECTION_COLUMN,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
  DISPLAY_BLOCK,
  Link,
  Card,
  JUSTIFY_SPACE_BETWEEN,
  TEXT_TRANSFORM_CAPITALIZE,
  Text,
} from '@opentrons/components'
import {
  parseInitialPipetteNamesByMount,
  parseInitialLoadedModulesBySlot,
  parseInitialLoadedLabwareBySlot,
  parseInitialLoadedLabwareByModuleId,
} from '@opentrons/api-client'

import { getIsProtocolAnalysisInProgress } from '../../redux/protocol-storage'
import { ProtocolAnalysisFailure } from '../ProtocolAnalysisFailure'
import { DeckThumbnail } from '../../molecules/DeckThumbnail'
import { StyledText } from '../../atoms/text'
import { PrimaryButton } from '../../atoms/Buttons'
import { Divider } from '../../atoms/structure'
import { ChooseRobotSlideout } from '../ChooseRobotSlideout'
import { OverflowMenu } from './OverflowMenu'
import { RobotConfigurationDetails } from './RobotConfigurationDetails'
import { ProtocolLabwareDetails } from './ProtocolLabwareDetails'
import {
  getAnalysisStatus,
  getProtocolDisplayName,
} from '../ProtocolsLanding/utils'

import type { State } from '../../redux/types'
import type { StoredProtocolData } from '../../redux/protocol-storage'

const defaultTabStyle = css`
  ${TYPOGRAPHY.pSemiBold}
  border-radius: ${BORDERS.radiusSoftCorners} ${BORDERS.radiusSoftCorners} 0 0;
  border-top: ${BORDERS.transparentLineBorder};
  border-left: ${BORDERS.transparentLineBorder};
  border-right: ${BORDERS.transparentLineBorder};
  color: ${COLORS.darkGreyEnabled};
  padding: ${SPACING.spacing3} ${SPACING.spacing4};
  position: ${POSITION_RELATIVE};
`

const currentTabStyle = css`
  background-color: ${COLORS.white};
  border-top: ${BORDERS.lineBorder};
  border-left: ${BORDERS.lineBorder};
  border-right: ${BORDERS.lineBorder};
  color: ${COLORS.blue};

  /* extend below the tab when active to flow into the content */
  &:after {
    position: ${POSITION_ABSOLUTE};
    display: ${DISPLAY_BLOCK};
    content: '';
    background-color: ${COLORS.white};
    top: 100;
    left: 0;
    height: ${SIZE_1};
    width: 100%;
  }
`
interface RoundTabProps extends React.ComponentProps<typeof Btn> {
  isCurrent: boolean
}
function RoundTab({
  isCurrent,
  children,
  ...restProps
}: RoundTabProps): JSX.Element {
  return (
    <Btn
      {...restProps}
      css={
        isCurrent
          ? css`
              ${defaultTabStyle}
              ${currentTabStyle}
            `
          : defaultTabStyle
      }
    >
      {children}
    </Btn>
  )
}

interface ProtocolDetailsProps extends StoredProtocolData {}

export function ProtocolDetails(
  props: ProtocolDetailsProps
): JSX.Element | null {
  const { protocolKey, srcFileNames, mostRecentAnalysis, modified } = props
  const { t } = useTranslation(['protocol_details', 'shared'])
  const [currentTab, setCurrentTab] = React.useState<
    'robot_config' | 'labware'
  >('robot_config')
  const [showSlideout, setShowSlideout] = React.useState(false)
  const isAnalyzing = useSelector((state: State) =>
    getIsProtocolAnalysisInProgress(state, protocolKey)
  )
  const analysisStatus = getAnalysisStatus(isAnalyzing, mostRecentAnalysis)
  if (analysisStatus === 'missing') return null

  const { left: leftMountPipetteName, right: rightMountPipetteName } =
    mostRecentAnalysis != null
      ? parseInitialPipetteNamesByMount(mostRecentAnalysis.commands)
      : { left: null, right: null }

  const requiredModuleDetails = map(
    parseInitialLoadedModulesBySlot(
      mostRecentAnalysis.commands != null ? mostRecentAnalysis.commands : []
    )
  )

  const requiredLabwareDetails = map({
    ...parseInitialLoadedLabwareByModuleId(
      mostRecentAnalysis.commands != null ? mostRecentAnalysis.commands : []
    ),
    ...parseInitialLoadedLabwareBySlot(
      mostRecentAnalysis.commands != null ? mostRecentAnalysis.commands : []
    ),
  }).filter(labware => labware.result.definition.parameters.format !== 'trash')

  const protocolDisplayName = getProtocolDisplayName(
    protocolKey,
    srcFileNames,
    mostRecentAnalysis
  )

  // TODO: IMMEDIATELY parse real values out of analysis file for these with fallback to no data
  const creationMethod = t('shared:no_data')
  const author = t('shared:no_data')
  const description = t('shared:no_data')
  const lastAnalyzed = t('shared:no_data')

  const getTabContents = (): JSX.Element =>
    currentTab === 'labware' ? (
      <ProtocolLabwareDetails requiredLabwareDetails={requiredLabwareDetails} />
    ) : (
      <RobotConfigurationDetails
        leftMountPipetteName={leftMountPipetteName}
        rightMountPipetteName={rightMountPipetteName}
        requiredModuleDetails={requiredModuleDetails}
      />
    )

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      padding={SPACING.spacing4}
      width="100%"
    >
      <ChooseRobotSlideout
        onCloseClick={() => setShowSlideout(false)}
        showSlideout={showSlideout}
        storedProtocolData={props}
      />
      <Card marginBottom={SPACING.spacing4} padding={SPACING.spacing4}>
        {analysisStatus !== 'loading' &&
        mostRecentAnalysis != null &&
        mostRecentAnalysis.errors.length > 0 ? (
          <ProtocolAnalysisFailure
            protocolKey={protocolKey}
            errors={mostRecentAnalysis.errors.map(e => e.detail)}
          />
        ) : null}
        <Flex
          flexDirection={DIRECTION_ROW}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
        >
          <StyledText
            as="h3"
            marginBottom={SPACING.spacing4}
            height="2.75rem"
            data-testid={`ProtocolDetails_${protocolDisplayName}`}
          >
            {protocolDisplayName}
          </StyledText>
          <OverflowMenu
            protocolKey={protocolKey}
            data-testid={`ProtocolDetails_overFlowMenu`}
          />
        </Flex>
        <Flex
          flexDirection={DIRECTION_ROW}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
        >
          <Flex
            flexDirection={DIRECTION_COLUMN}
            marginRight={SPACING.spacing4}
            data-testid={`ProtocolDetails_creationMethod`}
          >
            <StyledText as="h6">{t('creation_method')}</StyledText>
            <StyledText as="p">
              {analysisStatus === 'loading'
                ? t('shared:loading')
                : creationMethod}
            </StyledText>
          </Flex>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            marginRight={SPACING.spacing4}
            data-testid={`ProtocolDetails_lastUpdated`}
          >
            <StyledText as="h6">{t('last_updated')}</StyledText>
            <StyledText as="p">
              {analysisStatus === 'loading'
                ? t('shared:loading')
                : format(new Date(modified), 'MMMM dd, yyyy HH:mm')}
            </StyledText>
          </Flex>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            marginRight={SPACING.spacing4}
            data-testid={`ProtocolDetails_lastAnalyzed`}
          >
            <StyledText as="h6">{t('last_analyzed')}</StyledText>
            <StyledText as="p">
              {analysisStatus === 'loading'
                ? t('shared:loading')
                : lastAnalyzed}
            </StyledText>
          </Flex>
          <PrimaryButton
            onClick={() => setShowSlideout(true)}
            data-testid={`ProtocolDetails_runProtocol`}
          >
            {t('run_protocol')}
          </PrimaryButton>
        </Flex>
        <Divider marginY={SPACING.spacing4} />
        <Flex flexDirection={DIRECTION_ROW}>
          <Flex
            flex="1"
            flexDirection={DIRECTION_COLUMN}
            marginRight={SPACING.spacing4}
            data-testid={`ProtocolDetails_author`}
          >
            <StyledText as="h6">{t('org_or_author')}</StyledText>
            <StyledText as="p">
              {analysisStatus === 'loading' ? t('shared:loading') : author}
            </StyledText>
          </Flex>
          <Flex
            flex="1"
            flexDirection={DIRECTION_COLUMN}
            marginRight={SPACING.spacing4}
            data-testid={`ProtocolDetails_description`}
          >
            <StyledText as="h6">{t('description')}</StyledText>
            <StyledText as="p">
              {analysisStatus === 'loading' ? t('shared:loading') : description}
            </StyledText>
            <Link
              onClick={() =>
                console.log(
                  'TODO: truncate description if more than three lines'
                )
              }
            >
              {t('read_more')}
            </Link>
          </Flex>
        </Flex>
      </Card>

      <Flex
        flexDirection={DIRECTION_ROW}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
      >
        <Card
          flex="0 0 20rem"
          backgroundColor={COLORS.white}
          data-testid={`ProtocolDetails_deckMap`}
        >
          <StyledText
            as="h3"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            textTransform={TEXT_TRANSFORM_CAPITALIZE}
            margin={SPACING.spacing4}
          >
            {t('deck_setup')}
          </StyledText>
          <Divider />
          <Box padding={SPACING.spacing4} backgroundColor={COLORS.white}>
            {
              {
                missing: <Box size="15rem" backgroundColor={COLORS.medGrey} />,
                loading: <Box size="15rem" backgroundColor={COLORS.medGrey} />,
                error: <Box size="15rem" backgroundColor={COLORS.medGrey} />,
                complete: (
                  <DeckThumbnail
                    commands={mostRecentAnalysis?.commands ?? []}
                  />
                ),
              }[analysisStatus]
            }
          </Box>
        </Card>

        <Flex
          width="100%"
          height="100%"
          flexDirection={DIRECTION_COLUMN}
          marginLeft={SPACING.spacing4}
        >
          <Flex>
            <RoundTab
              data-testid={`ProtocolDetails_robotConfig`}
              isCurrent={currentTab === 'robot_config'}
              onClick={() => setCurrentTab('robot_config')}
            >
              <Text textTransform={TEXT_TRANSFORM_CAPITALIZE}>
                {t('robot_configuration')}
              </Text>
            </RoundTab>
            <RoundTab
              data-testid={`ProtocolDetails_labware`}
              isCurrent={currentTab === 'labware'}
              onClick={() => setCurrentTab('labware')}
            >
              <Text textTransform={TEXT_TRANSFORM_CAPITALIZE}>
                {t('labware')}
              </Text>
            </RoundTab>
          </Flex>
          <Box
            backgroundColor={COLORS.white}
            border={`${SPACING.spacingXXS} ${BORDERS.styleSolid} ${COLORS.medGrey}`}
            // remove left upper corner border radius when first tab is active
            borderRadius={`${
              currentTab === 'robot_config' ? '0' : BORDERS.radiusSoftCorners
            } ${BORDERS.radiusSoftCorners} ${BORDERS.radiusSoftCorners} ${
              BORDERS.radiusSoftCorners
            }`}
            padding={`${SPACING.spacing5} ${SPACING.spacing4}`}
          >
            {getTabContents()}
          </Box>
        </Flex>
      </Flex>
    </Flex>
  )
}
