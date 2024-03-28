import * as React from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  NoParameters,
  useHoverTooltip,
  Icon,
} from '@opentrons/components'

import { Banner } from '../../../atoms/Banner'
import { Divider } from '../../../atoms/structure'
import { Chip } from '../../../atoms/Chip'
import { useMostRecentCompletedAnalysis } from '../../LabwarePositionCheck/useMostRecentCompletedAnalysis'
import { formatRunTimeParameterValue } from '@opentrons/shared-data'

import type { RunTimeParameter } from '@opentrons/shared-data'
import { Tooltip } from '../../../atoms/Tooltip'

interface ProtocolRunRuntimeParametersProps {
  runId: string
}
export function ProtocolRunRuntimeParameters({
  runId,
}: ProtocolRunRuntimeParametersProps): JSX.Element {
  const { t } = useTranslation('protocol_setup')
  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)
  const runTimeParameters = mostRecentAnalysis?.runTimeParameters ?? []
  const hasParameter = runTimeParameters.length > 0

  const hasCustomValues = runTimeParameters.some(
    parameter => parameter.value !== parameter.default
  )

  return (
    <>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={SPACING.spacing16}
        gridGap={SPACING.spacing10}
      >
        <Flex
          flexDirection={DIRECTION_ROW}
          gridGap={SPACING.spacing8}
          alignItems={ALIGN_CENTER}
        >
          <StyledText as="h3" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
            {t('parameters')}
          </StyledText>
          {hasParameter ? (
            <StyledText as="label" color={COLORS.grey60}>
              {hasCustomValues ? t('custom_values') : t('default_values')}
            </StyledText>
          ) : null}
        </Flex>
        {hasParameter ? (
          <Banner
            type="informing"
            width="100%"
            iconMarginLeft={SPACING.spacing4}
          >
            <Flex flexDirection={DIRECTION_COLUMN}>
              <StyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
                {t('values_are_view_only')}
              </StyledText>
              <StyledText as="p">{t('cancel_and_restart_to_edit')}</StyledText>
            </Flex>
          </Banner>
        ) : null}
      </Flex>
      {!hasParameter ? (
        <Flex padding={SPACING.spacing16}>
          <NoParameters t={t} textKey="no_parameters_specified_in_protocol" />
        </Flex>
      ) : (
        <>
          <Divider width="100%" />
          <Flex flexDirection={DIRECTION_COLUMN} padding={SPACING.spacing16}>
            <StyledTable>
              <thead>
                <StyledTableHeader>{t('name')}</StyledTableHeader>
                <StyledTableHeader>{t('value')}</StyledTableHeader>
              </thead>
              <tbody>
                {runTimeParameters.map(
                  (parameter: RunTimeParameter, index: number) => (
                    <StyledTableRowComponent
                      key={`${index}_${parameter.variableName}`}
                      parameter={parameter}
                      index={index}
                      runTimeParametersLength={runTimeParameters.length}
                      t={t}
                    />
                  )
                )}
              </tbody>
            </StyledTable>
          </Flex>
        </>
      )}
    </>
  )
}

interface StyledTableRowComponentProps {
  parameter: RunTimeParameter
  index: number
  runTimeParametersLength: number
  t: any
}

const StyledTableRowComponent = (
  props: StyledTableRowComponentProps
): JSX.Element => {
  const { parameter, index, runTimeParametersLength, t } = props
  const [targetProps, tooltipProps] = useHoverTooltip()
  return (
    <StyledTableRow
      isLast={index === runTimeParametersLength - 1}
      key={`runTimeParameter-${index}`}
    >
      <StyledTableCell isLast={index === runTimeParametersLength - 1}>
        <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing8}>
          <StyledText as="p">{parameter.displayName}</StyledText>
          <Flex {...targetProps} alignItems={ALIGN_CENTER}>
            <Icon
              name="information"
              size={SPACING.spacing12}
              color={COLORS.grey60}
              data-testid="Icon"
            />
          </Flex>
          <Tooltip tooltipProps={tooltipProps}>{parameter.description}</Tooltip>
        </Flex>
      </StyledTableCell>
      <StyledTableCell isLast={index === runTimeParametersLength - 1}>
        <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing16}>
          <StyledText as="p">
            {formatRunTimeParameterValue(parameter, t)}
          </StyledText>
          {parameter.value !== parameter.default ? (
            <Chip
              text={t('updated')}
              type="success"
              hasIcon={false}
              chipSize="small"
              isOnDevice={false}
            />
          ) : null}
        </Flex>
      </StyledTableCell>
    </StyledTableRow>
  )
}

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`

const StyledTableHeader = styled.th`
  ${TYPOGRAPHY.labelSemiBold}
  padding: ${SPACING.spacing8};
  border-bottom: ${BORDERS.lineBorder};
`

interface StyledTableRowProps {
  isLast: boolean
}

const StyledTableRow = styled.tr<StyledTableRowProps>`
  padding: ${SPACING.spacing8};
  border-bottom: ${props => (props.isLast ? 'none' : BORDERS.lineBorder)};
  align-items: ${ALIGN_CENTER};
`

interface StyledTableCellProps {
  isLast: boolean
}

const StyledTableCell = styled.td<StyledTableCellProps>`
  padding-left: ${SPACING.spacing8};
  height: 2.25rem;
`
