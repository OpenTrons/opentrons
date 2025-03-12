import { Tag } from '@opentrons/components'

import { useTranslation } from 'react-i18next'

export interface OffsetTagDefaultKindProps {
  kind: 'default'
}

export interface OffsetTagVectorKindProps {
  kind: 'vector'
  x: number
  y: number
  z: number
}

export interface OffsetTagNoOffsetKindProps {
  kind: 'noOffset'
}

export type OffsetTagProps =
  | OffsetTagDefaultKindProps
  | OffsetTagVectorKindProps
  | OffsetTagNoOffsetKindProps

export function OffsetTag(props: OffsetTagProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')

  const buildCopy = (): string => {
    switch (props.kind) {
      case 'default':
        return t('default')
      case 'vector': {
        const { x, y, z } = props
        return t('offset_values', {
          x: x.toFixed(1),
          y: y.toFixed(1),
          z: z.toFixed(1),
        })
      }
      case 'noOffset':
        return t('no_offset_data')
    }
  }

  return (
    <Tag
      iconName={props.kind !== 'noOffset' ? 'reticle' : undefined}
      type="default"
      iconPosition="left"
      text={buildCopy()}
    />
  )
}
