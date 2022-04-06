import * as React from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import first from 'lodash/first'
import {
  getModuleType,
  getPipetteNameSpecs,
  ProtocolAnalysisFile,
} from '@opentrons/shared-data'

import {
  Flex,
  Icon,
  DIRECTION_ROW,
  COLORS,
  SPACING,
  JUSTIFY_SPACE_BETWEEN,
  DIRECTION_COLUMN,
  JUSTIFY_CENTER,
  ALIGN_CENTER,
  SIZE_3,
} from '@opentrons/components'
import { Link } from 'react-router-dom'
import {
  parseInitialPipetteNamesByMount,
  parseAllRequiredModuleModels,
} from '@opentrons/api-client'

import { StoredProtocolData } from '../../redux/protocol-storage'
import { StyledText } from '../../atoms/text'
import { ModuleIcon } from '../../molecules/ModuleIcon'
import { DeckThumbnail } from '../../molecules/DeckThumbnail'
import { ProtocolOverflowMenu } from './ProtocolOverflowMenu'

interface ProtocolCardProps extends StoredProtocolData {
  handleRunProtocol: () => void
}

export function ProtocolCard(props: ProtocolCardProps): JSX.Element | null {
  const { t } = useTranslation('protocol_list')
  const {
    handleRunProtocol,
    protocolKey,
    srcFileNames,
    mostRecentAnalysis,
    modified,
  } = props

  const protocolDisplayName =
    mostRecentAnalysis?.metadata?.protocolName ??
    first(srcFileNames) ??
    protocolKey

  return (
    <Link to={`/protocols/${protocolKey}`} style={{ color: 'inherit' }}>
      <Flex
        backgroundColor={COLORS.white}
        border={`1px solid ${COLORS.medGrey}`}
        borderRadius="4px"
        flexDirection={DIRECTION_ROW}
        marginBottom={SPACING.spacing3}
        padding={SPACING.spacing4}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        width="100%"
        position="relative"
      >
        {mostRecentAnalysis != null ? (
          <AnalysisInfo
            mostRecentAnalysis={mostRecentAnalysis}
            protocolDisplayName={protocolDisplayName}
          />
        ) : (
          <StyledText as="p">{t('loading_data')}</StyledText>
        )}
        <Flex flexDirection={DIRECTION_COLUMN}>
          <ProtocolOverflowMenu
            protocolKey={protocolKey}
            handleRunProtocol={handleRunProtocol}
          />
          <StyledText
            as="label"
            position="absolute"
            bottom={SPACING.spacing4}
            right={SPACING.spacing4}
          >
            {t('last_updated_at', {
              date: format(new Date(modified), 'MM/dd/yy HH:mm:ss'),
            })}
          </StyledText>
        </Flex>
      </Flex>
    </Link>
  )
}

interface AnalysisInfoProps {
  protocolDisplayName: string
  mostRecentAnalysis: ProtocolAnalysisFile<{}>
}
function AnalysisInfo(props: AnalysisInfoProps): JSX.Element {
  const { protocolDisplayName, mostRecentAnalysis } = props
  const { t } = useTranslation(['protocol_list', 'shared'])
  const robotModel = mostRecentAnalysis?.robot?.model ?? t('shared:no_data')
  const {
    left: leftMountPipetteName,
    right: rightMountPipetteName,
  } = parseInitialPipetteNamesByMount(mostRecentAnalysis)
  const requiredModuleTypes = parseAllRequiredModuleModels(
    mostRecentAnalysis
  ).map(getModuleType)

  return (
    <Flex>
      <Flex
        marginRight={SPACING.spacing4}
        height="6rem"
        width="6rem"
        justifyContent={JUSTIFY_CENTER}
        alignItems={ALIGN_CENTER}
      >
        {mostRecentAnalysis != null ? (
          <DeckThumbnail analysis={mostRecentAnalysis} />
        ) : (
          <Icon name="ot-spinner" spin size={SIZE_3} />
        )}
      </Flex>
      <Flex flexDirection={DIRECTION_COLUMN} marginRight={SPACING.spacing4}>
        <StyledText as="h3" marginBottom={SPACING.spacing4} height="2.75rem">
          {protocolDisplayName}
        </StyledText>
        <Flex>
          <Flex flexDirection={DIRECTION_COLUMN} marginRight={SPACING.spacing4}>
            <StyledText as="h6">{t('robot')}</StyledText>
            <StyledText as="p">{robotModel}</StyledText>
          </Flex>
          <Flex flexDirection={DIRECTION_COLUMN} marginRight={SPACING.spacing4}>
            <StyledText as="h6">{t('left_mount')}</StyledText>
            <StyledText as="p">
              {leftMountPipetteName != null
                ? getPipetteNameSpecs(leftMountPipetteName)?.displayName
                : t('empty')}
            </StyledText>
          </Flex>
          <Flex flexDirection={DIRECTION_COLUMN} marginRight={SPACING.spacing4}>
            <StyledText as="h6">{t('right_mount')}</StyledText>
            <StyledText as="p">
              {rightMountPipetteName != null
                ? getPipetteNameSpecs(rightMountPipetteName)?.displayName
                : t('empty')}
            </StyledText>
          </Flex>
          {requiredModuleTypes.length > 0 ? (
            <Flex
              flexDirection={DIRECTION_COLUMN}
              marginRight={SPACING.spacing4}
            >
              <StyledText as="h6">{t('modules')}</StyledText>
              <Flex>
                {requiredModuleTypes.map((moduleType, index) => (
                  <ModuleIcon
                    key={index}
                    moduleType={moduleType}
                    height="1rem"
                    marginRight={SPACING.spacing3}
                  />
                ))}
              </Flex>
            </Flex>
          ) : null}
        </Flex>
      </Flex>
    </Flex>
  )
}
