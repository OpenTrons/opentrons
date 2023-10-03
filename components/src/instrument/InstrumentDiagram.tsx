import * as React from 'react'
import { FlattenSimpleInterpolation } from 'styled-components'
import { Flex, JUSTIFY_CENTER } from '..'
import singleSrc from '@opentrons/components/src/instrument/single_channel_GEN1_800px.png'
import multiSrc from '@opentrons/components/src/instrument/multi-channel_GEN1_800px.png'
import singleGEN2Src from '@opentrons/components/src/instrument/single-channel_GEN2_800px.png'
import multiGEN2Src from '@opentrons/components/src/instrument/multi-channel_GEN2_800px.png'
import singleFlexSrc from '@opentrons/components/src/instrument/single-channel-flex.png'
import eightChannelFlexSrc from '@opentrons/components/src/instrument/eight-channel-flex.png'
import ninetySixSrc from '@opentrons/components/src/instrument/ninety-six-channel-gen1.png'

import type { PipetteNameSpecs } from '@opentrons/shared-data'
import type { Mount } from '../robot-types'
import type { StyleProps } from '..'

export interface InstrumentDiagramProps extends StyleProps {
  mount: Mount
  pipetteSpecs?: Pick<PipetteNameSpecs, 'displayCategory' | 'channels'> | null
  className?: string
  imageStyle?: FlattenSimpleInterpolation
}

export function InstrumentDiagram(props: InstrumentDiagramProps): JSX.Element {
  const { mount, pipetteSpecs, imageStyle } = props
  const { displayCategory, channels } = pipetteSpecs || {}

  let imgSrc
  switch (displayCategory) {
    case 'FLEX': {
      imgSrc = channels === 1 ? singleFlexSrc : eightChannelFlexSrc
      break
    }
    case 'GEN2': {
      imgSrc = channels === 1 ? singleGEN2Src : multiGEN2Src
      break
    }
    case 'GEN1':
    default: {
      imgSrc = channels === 1 ? singleSrc : multiSrc
    }
  }
  return (
    <Flex
      transform={mount === 'right' ? 'scaleX(-1)' : ''}
      filter={mount === 'right' ? 'FlipH' : ''}
      width="60px"
      height="54px"
      justifyContent={JUSTIFY_CENTER}
    >
      <img
        src={channels === 96 ? ninetySixSrc : imgSrc}
        css={imageStyle}
        max-width="100%"
        max-height="100%"
      />
    </Flex>
  )
}
