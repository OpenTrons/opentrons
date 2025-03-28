import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import pick from 'lodash/pick'

import {
  getLabwareDisplayName,
  getLoadedLabwareDefinitionsByUri,
  OT2_ROBOT_TYPE,
} from '@opentrons/shared-data'
import {
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  getLabwareDefinitionsFromCommands,
} from '@opentrons/components'

import { getIsLabwareOffsetCodeSnippetsOn } from '/app/redux/config'
import { LegacyLabwareOffsetTabs } from '/app/organisms/LegacyLabwareOffsetTabs'
import { LegacyOffsetVector } from '/app/molecules/LegacyOffsetVector'
import { LabwareOffsetSnippet } from '/app/molecules/LabwareOffsetSnippet'
import { getDisplayLocation } from '/app/organisms/LegacyLabwarePositionCheck/utils/getDisplayLocation'
import type { LabwareOffset } from '@opentrons/api-client'
import type {
  RunTimeCommand,
  LoadedLabware,
  LoadedModule,
} from '@opentrons/shared-data'
import type { TFunction } from 'i18next'

const OffsetTable = styled('table')`
  ${TYPOGRAPHY.labelRegular}
  table-layout: auto;
  width: 100%;
  border-spacing: 0 ${SPACING.spacing2};
  margin: ${SPACING.spacing16} 0;
  text-align: left;
`
const OffsetTableHeader = styled('th')`
  text-transform: ${TYPOGRAPHY.textTransformCapitalize};
  font-weight: ${TYPOGRAPHY.fontWeightRegular};
  padding: ${SPACING.spacing4};
`
const OffsetTableRow = styled('tr')`
  background-color: ${COLORS.grey10};
  padding: ${SPACING.spacing8};
`

const OffsetTableDatum = styled('td')`
  padding: ${SPACING.spacing8};
  white-space: break-spaces;
  text-overflow: wrap;
`

interface LegacyCurrentOffsetsTableProps {
  currentOffsets: LabwareOffset[]
  commands: RunTimeCommand[]
  labware: LoadedLabware[]
  modules: LoadedModule[]
}
export function LegacyCurrentOffsetsTable(
  props: LegacyCurrentOffsetsTableProps
): JSX.Element {
  const { currentOffsets, commands, labware, modules } = props
  const { t, i18n } = useTranslation(['labware_position_check', 'shared'])
  const defsByURI = getLoadedLabwareDefinitionsByUri(commands)
  const isLabwareOffsetCodeSnippetsOn = useSelector(
    getIsLabwareOffsetCodeSnippetsOn
  )

  const TableComponent = (
    <OffsetTable>
      <thead>
        <tr>
          <OffsetTableHeader>{t('location')}</OffsetTableHeader>
          <OffsetTableHeader>{t('labware')}</OffsetTableHeader>
          <OffsetTableHeader>
            {t('legacy_labware_offset_data')}
          </OffsetTableHeader>
        </tr>
      </thead>
      <tbody>
        {currentOffsets.map(offset => {
          const labwareDisplayName =
            offset.definitionUri in defsByURI
              ? getLabwareDisplayName(defsByURI[offset.definitionUri])
              : offset.definitionUri
          return (
            <OffsetTableRow key={offset.id}>
              <OffsetTableDatum
                css={`
                  border-radius: ${BORDERS.borderRadius8} 0 0
                    ${BORDERS.borderRadius8};
                `}
              >
                {getDisplayLocation(
                  offset.location,
                  getLabwareDefinitionsFromCommands(commands),
                  t as TFunction,
                  i18n
                )}
              </OffsetTableDatum>
              <OffsetTableDatum>{labwareDisplayName}</OffsetTableDatum>
              <OffsetTableDatum
                css={`
                  border-radius: 0 ${BORDERS.borderRadius8}
                    ${BORDERS.borderRadius8} 0;
                `}
              >
                <LegacyOffsetVector {...offset.vector} />
              </OffsetTableDatum>
            </OffsetTableRow>
          )
        })}
      </tbody>
    </OffsetTable>
  )

  const JupyterSnippet = (
    <LabwareOffsetSnippet
      mode="jupyter"
      labwareOffsets={currentOffsets.map(o =>
        pick(o, ['definitionUri', 'location', 'vector'])
      )}
      commands={commands ?? []}
      labware={labware ?? []}
      modules={modules ?? []}
      robotType={OT2_ROBOT_TYPE}
    />
  )
  const CommandLineSnippet = (
    <LabwareOffsetSnippet
      mode="cli"
      labwareOffsets={currentOffsets.map(o =>
        pick(o, ['definitionUri', 'location', 'vector'])
      )}
      commands={commands ?? []}
      labware={labware ?? []}
      modules={modules ?? []}
      robotType={OT2_ROBOT_TYPE}
    />
  )
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
    >
      <LegacyStyledText as="label">
        {i18n.format(t('applied_offset_data'), 'upperCase')}
      </LegacyStyledText>
      {isLabwareOffsetCodeSnippetsOn ? (
        <LegacyLabwareOffsetTabs
          TableComponent={TableComponent}
          JupyterComponent={JupyterSnippet}
          CommandLineComponent={CommandLineSnippet}
        />
      ) : (
        TableComponent
      )}
    </Flex>
  )
}
