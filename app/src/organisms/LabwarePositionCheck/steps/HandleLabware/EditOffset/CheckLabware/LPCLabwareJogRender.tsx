import { css } from 'styled-components'
import { useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  COLORS,
  Flex,
  LabwareRender,
  PipetteRender,
  RobotWorkSpace,
  SPACING,
  WELL_LABEL_OPTIONS,
} from '@opentrons/components'

import {
  selectActivePipette,
  selectIsSelectedLwTipRack,
  selectSelectedLwDef,
} from '/app/redux/protocol-runs'

import levelProbeWithTip from '/app/assets/images/lpc_level_probe_with_tip.svg'
import levelProbeWithLabware from '/app/assets/images/lpc_level_probe_with_labware.svg'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { EditOffsetContentProps } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset'

// TODO(jh, 03-12-25): Standardize viewboxes.
const DECK_MAP_VIEWBOX = '-10 -10 150 105'

export function LPCLabwareJogRender({
  runId,
}: EditOffsetContentProps): JSX.Element {
  const pipetteName =
    useSelector(selectActivePipette(runId))?.pipetteName ?? 'p1000_single'
  const itemLwDef = useSelector(
    selectSelectedLwDef(runId)
  ) as LabwareDefinition2
  const isLwTiprack = useSelector(selectIsSelectedLwTipRack(runId))

  const levelSrc = isLwTiprack ? levelProbeWithTip : levelProbeWithLabware

  // TODO(jh, 03-07-25): RQA-3972.
  return (
    <Flex css={RENDER_CONTAINER_STYLE}>
      <RobotWorkSpace viewBox={DECK_MAP_VIEWBOX}>
        {() => (
          <>
            <LabwareRender
              definition={itemLwDef}
              wellStroke={{ A1: COLORS.blue50 }}
              wellLabelOption={WELL_LABEL_OPTIONS.SHOW_LABEL_OUTSIDE}
              highlightedWellLabels={{ wells: ['A1'] }}
              labwareStroke={COLORS.grey30}
              wellLabelColor={COLORS.grey30}
            />
            <PipetteRender
              labwareDef={itemLwDef}
              pipetteName={pipetteName}
              usingMetalProbe={true}
            />
          </>
        )}
      </RobotWorkSpace>
      <img
        width="89px"
        height="145px"
        src={levelSrc}
        alt={`level with ${isLwTiprack ? 'tip' : 'labware'}`}
      />
    </Flex>
  )
}

const RENDER_CONTAINER_STYLE = css`
  flex: 1;
  align-items: ${ALIGN_CENTER};
  grid-gap: ${SPACING.spacing20};
`
