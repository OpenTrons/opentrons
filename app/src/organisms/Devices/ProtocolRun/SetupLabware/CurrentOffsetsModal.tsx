import * as React from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  getLabwareDisplayName,
  getLoadedLabwareDefinitionsByUri,
  getModuleDisplayName,
  RunTimeCommand,
} from '@opentrons/shared-data'
import {
  Flex,
  DIRECTION_COLUMN,
  SPACING,
  TYPOGRAPHY,
  COLORS,
  JUSTIFY_SPACE_BETWEEN,
  JUSTIFY_FLEX_END,
  ALIGN_CENTER,
  Link,
} from '@opentrons/components'
import { getIsLabwareOffsetCodeSnippetsOn } from '../../../../redux/config'
import { ModalHeader, ModalShell } from '../../../../molecules/Modal'
import { PrimaryButton } from '../../../../atoms/buttons'
import { OffsetVector } from '../../../../molecules/OffsetVector'
import type { LabwareOffset } from '@opentrons/api-client'

const OffsetTable = styled('table')`
  ${TYPOGRAPHY.labelRegular}
  table-layout: auto;
  width: 100%;
  border-spacing: 0 ${SPACING.spacing1};
  margin: ${SPACING.spacing4} 0;
  text-align: left;
`
const OffsetTableHeader = styled('th')`
  text-transform: ${TYPOGRAPHY.textTransformCapitalize};
  padding: ${SPACING.spacing2};
`
const OffsetTableRow = styled('tr')`
  background-color: ${COLORS.fundamentalsBackground};
  padding: ${SPACING.spacing3};
`

const OffsetTableDatum = styled('td')`
  padding: ${SPACING.spacing3};
  white-space: break-spaces;
  text-overflow: wrap;
`

interface CurrentOffsetsModalProps {
  currentOffsets: LabwareOffset[]
  commands: RunTimeCommand[]
  onCloseClick: () => void
}
export function CurrentOffsetsModal(
  props: CurrentOffsetsModalProps
): JSX.Element {
  const { currentOffsets, commands, onCloseClick } = props
  const { t } = useTranslation(['labware_position_check', 'shared'])
  const defsByURI = getLoadedLabwareDefinitionsByUri(commands)
  const [showCodeSnippet, setShowCodeSnippet] = React.useState<boolean>(false)
  const isLabwareOffsetCodeSnippetsOn = useSelector(
    getIsLabwareOffsetCodeSnippetsOn
  )

  return (
    <ModalShell
      maxWidth="40rem"
      header={
        <ModalHeader title={t('applied_offset_data')} onClose={onCloseClick} />
      }
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        padding={SPACING.spacing6}
      >
        {isLabwareOffsetCodeSnippetsOn ? (
          <Link
            role="link"
            css={TYPOGRAPHY.labelSemiBold}
            color={COLORS.darkBlackEnabled}
            onClick={() => setShowCodeSnippet(true)}
          >
            {t('get_labware_offset_data')}
          </Link>
        ) : null}
        {showCodeSnippet ? (
          <PrimaryButton onClick={() => setShowCodeSnippet(false)}>
            TODO ADD JUPYTER/CLI SNIPPET SUPPORT
          </PrimaryButton>
        ) : null}

        <OffsetTable>
          <thead>
            <tr>
              <OffsetTableHeader>{t('location')}</OffsetTableHeader>
              <OffsetTableHeader>{t('labware')}</OffsetTableHeader>
              <OffsetTableHeader>{t('labware_offset_data')}</OffsetTableHeader>
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
                  <OffsetTableDatum>
                    {t('slot', { slotName: offset.location.slotName })}
                    {offset.location.moduleModel != null
                      ? ` - ${String(
                          getModuleDisplayName(offset.location.moduleModel)
                        )}`
                      : null}
                  </OffsetTableDatum>
                  <OffsetTableDatum>{labwareDisplayName}</OffsetTableDatum>
                  <OffsetTableDatum>
                    <OffsetVector {...offset.vector} />
                  </OffsetTableDatum>
                </OffsetTableRow>
              )
            })}
          </tbody>
        </OffsetTable>
        <Flex
          width="100%"
          marginTop={SPACING.spacing6}
          justifyContent={JUSTIFY_FLEX_END}
          alignItems={ALIGN_CENTER}
          gridGap={SPACING.spacing3}
        >
          <Link
            css={TYPOGRAPHY.linkPSemiBold}
            textTransform={TYPOGRAPHY.textTransformCapitalize}
            onClick={onCloseClick}
            role="button"
          >
            {t('shared:cancel')}
          </Link>
          <PrimaryButton
            textTransform={TYPOGRAPHY.textTransformCapitalize}
            onClick={() => {
              console.log('TODO, run LPC')
            }}
          >
            {t('run_labware_position_check')}
          </PrimaryButton>
        </Flex>
      </Flex>
    </ModalShell>
  )
}
