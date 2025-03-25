import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import isEqual from 'lodash/isEqual'
import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  ALIGN_END,
  Banner,
  BORDERS,
  Box,
  COLORS,
  DeckInfoLabel,
  DIRECTION_COLUMN,
  Flex,
  InfoScreen,
  JUSTIFY_FLEX_START,
  LegacyStyledText,
  MODULE_ICON_NAME_BY_TYPE,
  OVERFLOW_HIDDEN,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  FLEX_STACKER_MODULE_TYPE,
  getLabwareDefURI,
  getLabwareDisplayName,
  getLoadedLabwareDefinitionsByUri,
  getModuleType,
} from '@opentrons/shared-data'
import { useCsvFileQuery } from '@opentrons/react-api-client'
import { DownloadCsvFileLink } from './DownloadCsvFileLink'
import { useMostRecentCompletedAnalysis } from '/app/resources/runs'
import { useDeckCalibrationData } from './hooks'
import { LegacyOffsetVector } from '/app/molecules/LegacyOffsetVector'
import type { LabwareOffset, RunData } from '@opentrons/api-client'

interface HistoricalProtocolRunDrawerProps {
  run: RunData
  robotName: string
}

export function HistoricalProtocolRunDrawer(
  props: HistoricalProtocolRunDrawerProps
): JSX.Element | null {
  const { i18n, t } = useTranslation('run_details')
  const { run, robotName } = props
  const allLabwareOffsets: LabwareOffset[] =
    run.labwareOffsets?.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ) ?? []
  const runDataFileIds =
    'runTimeParameters' in run
      ? run.runTimeParameters.reduce<string[]>((acc, parameter) => {
          if (parameter.type === 'csv_file') {
            return parameter.file?.id != null
              ? [...acc, parameter.file?.id]
              : acc
          }
          return acc
        }, [])
      : []
  if ('outputFileIds' in run && run.outputFileIds.length > 0) {
    runDataFileIds.push(...run.outputFileIds)
  }

  const uniqueLabwareOffsets = allLabwareOffsets.filter(
    (offset, index, array) => {
      return (
        array.findIndex(
          firstOffset =>
            isEqual(firstOffset.locationSequence, offset.locationSequence) &&
            isEqual(firstOffset.definitionUri, offset.definitionUri)
        ) === index
      )
    }
  )
  const sortedUniqueLwOffsets = uniqueLabwareOffsets.sort((a, b) =>
    a.location.slotName.localeCompare(b.location.slotName, 'en', {
      numeric: true,
    })
  )

  const deckCalibrationData = useDeckCalibrationData(robotName)
    .deckCalibrationData
  const lastModifiedDeckCal =
    deckCalibrationData != null && 'lastModified' in deckCalibrationData
      ? deckCalibrationData.lastModified
      : null
  const protocolDetails = useMostRecentCompletedAnalysis(run.id)

  const isOutOfDate =
    typeof lastModifiedDeckCal === 'string' &&
    sortedUniqueLwOffsets.length > 0 &&
    new Date(lastModifiedDeckCal).getTime() >
      new Date(
        sortedUniqueLwOffsets[sortedUniqueLwOffsets?.length - 1].createdAt
      ).getTime()
  const outOfDateBanner = isOutOfDate ? (
    <Banner
      type="warning"
      marginTop={SPACING.spacing8}
      iconMarginLeft={SPACING.spacing4}
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <LegacyStyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
          {t('data_out_of_date')}
        </LegacyStyledText>
        <LegacyStyledText as="p">
          {t('robot_was_recalibrated')}
        </LegacyStyledText>
      </Flex>
    </Banner>
  ) : null

  const protocolFilesData =
    runDataFileIds.length === 0 ? (
      <InfoScreen content={t('no_files_included')} />
    ) : (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <LegacyStyledText>{t('protocol_files')}</LegacyStyledText>
        <Flex
          direction={DIRECTION_COLUMN}
          justifyContent={JUSTIFY_FLEX_START}
          alignItems={ALIGN_END}
          gridGap={SPACING.spacing24}
          color={COLORS.grey60}
          padding={`${SPACING.spacing4} ${SPACING.spacing12}`}
        >
          <Box width="33%">
            <LegacyStyledText
              as="p"
              datatest-id="RecentProtocolRun_Drawer_fileNameTitle"
            >
              {t('name')}
            </LegacyStyledText>
          </Box>
          <Box width="33%">
            <LegacyStyledText
              as="p"
              datatest-id="RecentProtocolRun_Drawer_fileDateTitle"
            >
              {t('date')}
            </LegacyStyledText>
          </Box>
          <Box width="34%">
            <LegacyStyledText
              as="p"
              datatest-id="RecentProtocolRun_Drawer_fileDownloadTitle"
            >
              {t('download')}
            </LegacyStyledText>
          </Box>
        </Flex>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
          {runDataFileIds.map((fileId, index) => {
            return <CsvFileDataRow key={`csv_file_${index}`} fileId={fileId} />
          })}
        </Flex>
      </Flex>
    )

  const labwareOffsets =
    sortedUniqueLwOffsets == null || sortedUniqueLwOffsets.length === 0 ? (
      <InfoScreen content={t('no_offsets_available')} />
    ) : (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        {outOfDateBanner}
        <LegacyStyledText>
          {i18n.format(t('labware_offset_data'), 'capitalize')}
        </LegacyStyledText>
        <Flex
          direction={DIRECTION_COLUMN}
          justifyContent={JUSTIFY_FLEX_START}
          alignItems={ALIGN_END}
          gridGap={SPACING.spacing4}
          color={COLORS.grey60}
          padding={`${SPACING.spacing4} ${SPACING.spacing12}`}
        >
          <Box
            width="33%"
            paddingY={`${SPACING.spacing4} ${SPACING.spacing8} ${SPACING.spacing4} ${SPACING.spacing4}`}
          >
            <LegacyStyledText
              as="p"
              datatest-id="RecentProtocolRun_Drawer_locationTitle"
            >
              {i18n.format(t('location'), 'capitalize')}
            </LegacyStyledText>
          </Box>
          <Box width="33%" padding={`${SPACING.spacing4} ${SPACING.spacing8}`}>
            <LegacyStyledText
              as="p"
              datatest-id="RecentProtocolRun_Drawer_labwareTitle"
            >
              {i18n.format(t('labware'), 'capitalize')}
            </LegacyStyledText>
          </Box>
          <Box width="34%" padding={`${SPACING.spacing4} ${SPACING.spacing8}`}>
            <LegacyStyledText
              as="p"
              datatest-id="RecentProtocolRun_Drawer_labwareOffsetDataTitle"
            >
              {i18n.format(t('labware_offset_data'), 'sentenceCase')}
            </LegacyStyledText>
          </Box>
        </Flex>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
          {sortedUniqueLwOffsets.map((offset, index) => {
            const labwareDefinitions =
              protocolDetails?.commands != null
                ? getLoadedLabwareDefinitionsByUri(protocolDetails?.commands)
                : {}
            const definition = Object.values(labwareDefinitions).find(
              def => getLabwareDefURI(def) === offset.definitionUri
            )
            const labwareName =
              definition != null
                ? getLabwareDisplayName(definition)
                : offset.definitionUri

            return (
              <Flex
                key={`labware_offset_${index}`}
                justifyContent={JUSTIFY_FLEX_START}
                alignItems={ALIGN_CENTER}
                padding={SPACING.spacing12}
                backgroundColor={COLORS.white}
                borderRadius={BORDERS.borderRadius4}
                gridGap={SPACING.spacing24}
              >
                <Flex
                  width="33%"
                  gridGap={SPACING.spacing4}
                  alignItems={ALIGN_CENTER}
                >
                  <DeckInfoLabel deckLabel={offset.location.slotName} />
                  {offset.locationSequence?.some(
                    seq => seq.kind === 'onLabware'
                  ) && (
                    <DeckInfoLabel
                      iconName={
                        MODULE_ICON_NAME_BY_TYPE[FLEX_STACKER_MODULE_TYPE]
                      }
                      key="stacked-icon"
                    />
                  )}
                  {offset.location.moduleModel && (
                    <DeckInfoLabel
                      iconName={
                        MODULE_ICON_NAME_BY_TYPE[
                          getModuleType(offset.location.moduleModel)
                        ]
                      }
                    />
                  )}
                </Flex>
                <Box width="33%">
                  <LegacyStyledText as="p" title={labwareName}>
                    {labwareName}
                  </LegacyStyledText>
                </Box>
                <Box width="34%">
                  <LegacyOffsetVector
                    {...offset.vector}
                    fontSize={TYPOGRAPHY.fontSizeLabel}
                    as="p"
                  />
                </Box>
              </Flex>
            )
          })}
        </Flex>
      </Flex>
    )

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing24}
      backgroundColor={COLORS.grey20}
      width="100%"
      padding={SPACING.spacing16}
    >
      {protocolFilesData}
      {labwareOffsets}
    </Flex>
  )
}

interface CsvFileDataRowProps {
  fileId: string
}

function CsvFileDataRow(props: CsvFileDataRowProps): JSX.Element | null {
  const { fileId } = props

  const { data: fileData } = useCsvFileQuery(fileId)
  if (fileData == null) {
    return null
  }
  const { name, createdAt } = fileData.data
  return (
    <Flex
      justifyContent={JUSTIFY_FLEX_START}
      alignItems={ALIGN_CENTER}
      padding={SPACING.spacing12}
      backgroundColor={COLORS.white}
      borderRadius={BORDERS.borderRadius4}
      gridGap={SPACING.spacing24}
    >
      <Flex width="33%" gridGap={SPACING.spacing4} alignItems={ALIGN_CENTER}>
        <LegacyStyledText
          as="p"
          css={css`
            overflow: ${OVERFLOW_HIDDEN};
            text-overflow: ellipsis;
          `}
        >
          {name}
        </LegacyStyledText>
      </Flex>
      <Box width="33%">
        <LegacyStyledText as="p">
          {format(new Date(createdAt), 'M/d/yy HH:mm:ss')}
        </LegacyStyledText>
      </Box>
      <Box width="34%">
        <DownloadCsvFileLink fileId={fileId} fileName={name} />
      </Box>
    </Flex>
  )
}
