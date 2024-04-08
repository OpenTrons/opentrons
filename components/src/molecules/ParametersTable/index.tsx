import * as React from 'react'
import styled, { css } from 'styled-components'
import { formatRunTimeParameterDefaultValue } from '@opentrons/shared-data'
import { BORDERS, COLORS } from '../../helix-design-system'
import { SPACING, TYPOGRAPHY } from '../../ui-style-constants/index'
import { StyledText } from '../../atoms/StyledText'
import { Tooltip, useHoverTooltip } from '../../tooltips'
import { Icon } from '../../icons'
import { Flex } from '../../primitives'
import { DISPLAY_INLINE } from '../../styles'

import type { RunTimeParameter } from '@opentrons/shared-data'

interface ProtocolParameterItemsProps {
  runTimeParameters: RunTimeParameter[]
  t?: any
}

/** used in both the desktop app and Protocol Library
 * to display the run time parameters table
 */
export function ParametersTable({
  runTimeParameters,
  t,
}: ProtocolParameterItemsProps): JSX.Element {
  const formatRange = (
    runTimeParameter: RunTimeParameter,
    minMax: string
  ): string => {
    const { type } = runTimeParameter
    const choices =
      'choices' in runTimeParameter ? runTimeParameter.choices : []
    const count = choices.length

    if (count > 0) {
      return count > 2
        ? t != null
          ? t('num_options', { num: count })
          : `${count} options`
        : choices.map(choice => choice.displayName).join(', ')
    }

    switch (type) {
      case 'int':
      case 'float':
        return minMax
      case 'bool':
        return t != null ? t('on_off') : 'On, off'
      default:
        return ''
    }
  }

  return (
    <StyledTable>
      <thead>
        <StyledTableHeader>{t != null ? t('name') : 'Name'}</StyledTableHeader>
        <StyledTableHeader>
          {t != null ? t('default_value') : 'Default Value'}
        </StyledTableHeader>
        <StyledTableHeader>
          {t != null ? t('range') : 'Range'}
        </StyledTableHeader>
      </thead>
      <tbody>
        {runTimeParameters.map((parameter: RunTimeParameter, index: number) => {
          const min = 'min' in parameter ? parameter.min : 0
          const max = 'max' in parameter ? parameter.max : 0
          return (
            <StyledTableRow
              isLast={index === runTimeParameters.length - 1}
              key={`runTimeParameter-${index}`}
            >
              <ParameterName
                displayName={parameter.displayName}
                description={parameter.description}
                isLast={index === runTimeParameters.length - 1}
                index={index}
              />
              <StyledTableCell isLast={index === runTimeParameters.length - 1}>
                <StyledText as="p">
                  {formatRunTimeParameterDefaultValue(parameter, t)}
                </StyledText>
              </StyledTableCell>
              <StyledTableCell
                isLast={index === runTimeParameters.length - 1}
                paddingRight="0"
              >
                <StyledText as="p">
                  {formatRange(parameter, `${min}-${max}`)}
                </StyledText>
              </StyledTableCell>
            </StyledTableRow>
          )
        })}
      </tbody>
    </StyledTable>
  )
}

interface ParameterNameProps {
  displayName: string
  description: string | null
  isLast: boolean
  index: number
}

const ParameterName = (props: ParameterNameProps): JSX.Element => {
  const { displayName, description, isLast, index } = props
  const [targetProps, tooltipProps] = useHoverTooltip()

  return (
    <StyledTableCell display="span" isLast={isLast}>
      <StyledText
        as="p"
        css={css`
          display: ${DISPLAY_INLINE};
          padding-right: ${SPACING.spacing8};
        `}
      >
        {displayName}
      </StyledText>
      {description != null ? (
        <>
          <Flex display={DISPLAY_INLINE} {...targetProps}>
            <Icon
              name="information"
              size={SPACING.spacing12}
              color={COLORS.grey60}
              data-testid={`Icon_${index}`}
            />
          </Flex>
          <Tooltip
            {...tooltipProps}
            backgroundColor={COLORS.black90}
            css={TYPOGRAPHY.labelRegular}
            width="8.75rem"
          >
            {description}
          </Tooltip>
        </>
      ) : null}
    </StyledTableCell>
  )
}

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`

const StyledTableHeader = styled.th`
  ${TYPOGRAPHY.labelSemiBold}
  grid-gap: ${SPACING.spacing16};
  padding-bottom: ${SPACING.spacing8};
  border-bottom: ${BORDERS.lineBorder};
`

interface StyledTableRowProps {
  isLast: boolean
}

const StyledTableRow = styled.tr<StyledTableRowProps>`
  grid-gap: ${SPACING.spacing16};
  border-bottom: ${props => (props.isLast ? 'none' : BORDERS.lineBorder)};
`

interface StyledTableCellProps {
  isLast: boolean
  paddingRight?: string
  display?: string
}

const StyledTableCell = styled.td<StyledTableCellProps>`
  width: 33%;
  display: ${props => (props.display != null ? props.display : 'table-cell')};
  padding-top: ${SPACING.spacing12};
  padding-bottom: ${props => (props.isLast ? 0 : SPACING.spacing12)};
  padding-right: ${props =>
    props.paddingRight != null ? props.paddingRight : SPACING.spacing16};
`
