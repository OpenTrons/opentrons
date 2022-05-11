import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

import { SPACING, TYPOGRAPHY } from '@opentrons/components'

import { StyledText } from '../../../../atoms/text'
import { OverflowMenu } from './OverflowMenu'
import { formatLastCalibrated } from './utils'
import { getDisplayNameForTipRack } from '../../../../pages/Robots/InstrumentSettings/utils'
import { getCustomLabwareDefinitions } from '../../../../redux/custom-labware'

import type {
  FormattedPipetteOffsetCalibration,
  FormattedTipLengthCalibration,
} from '../RobotSettingsCalibration'
import type { State } from '../../../../redux/types'

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`
const StyledTableHeader = styled.th`
  ${TYPOGRAPHY.labelSemiBold}
  padding: ${SPACING.spacing3};
`
const StyledTableRow = styled.tr`
  padding: ${SPACING.spacing3}; ;
`
const StyledTableCell = styled.td`
  padding: ${SPACING.spacing3};
  text-overflow: wrap;
`

interface TipLengthCallItemsProps {
  robotName: string
  formattedPipetteOffsetCalibrations: FormattedPipetteOffsetCalibration[]
  formattedTipLengthCalibrations: FormattedTipLengthCalibration[]
}

export function TipLengthCalItems({
  robotName,
  formattedPipetteOffsetCalibrations,
  formattedTipLengthCalibrations,
}: TipLengthCallItemsProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const customLabwareDefs = useSelector((state: State) => {
    return getCustomLabwareDefinitions(state)
  })
  const tipLengthCalibrations = formattedTipLengthCalibrations.map(
    tipLength => {
      return {
        modelName: formattedPipetteOffsetCalibrations.find(
          p => p.serialNumber === tipLength.pipette
        )?.modelName,
        serialNumber: tipLength.pipette,
        mount: formattedPipetteOffsetCalibrations.find(
          p => p.serialNumber === tipLength.pipette
        )?.mount,
        tiprack: tipLength.uri,
        lastCalibrated: tipLength.lastCalibrated,
      }
    }
  )

  return (
    <>
      <StyledTable>
        <tr>
          <StyledTableHeader>{t('table_header_tiprack')}</StyledTableHeader>
          <StyledTableHeader>
            {t('table_header_model_and_serial')}
          </StyledTableHeader>
          <StyledTableHeader>
            {t('table_header_last_calibrated')}
          </StyledTableHeader>
        </tr>
        {tipLengthCalibrations.map((calibration, index) => (
          <StyledTableRow key={index}>
            <StyledTableCell>
              <StyledText as="p">
                {getDisplayNameForTipRack(
                  calibration.tiprack,
                  customLabwareDefs
                )}
              </StyledText>
            </StyledTableCell>
            <StyledTableCell>
              <StyledText as="p">{calibration.modelName}</StyledText>
              <StyledText as="p">{calibration.serialNumber}</StyledText>
            </StyledTableCell>
            <StyledTableCell>
              <StyledText as="p">
                {formatLastCalibrated(calibration.lastCalibrated)}
              </StyledText>
            </StyledTableCell>

            <StyledTableCell>
              <OverflowMenu
                calType="tipLength"
                robotName={robotName}
                serialNumber={calibration.serialNumber}
                mount={calibration.mount}
              />
            </StyledTableCell>
          </StyledTableRow>
        ))}
      </StyledTable>
    </>
  )
}
