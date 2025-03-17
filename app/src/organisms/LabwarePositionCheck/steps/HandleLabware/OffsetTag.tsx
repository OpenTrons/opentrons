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

export interface OffsetTagHardCodedKindProps {
  kind: 'hardcoded'
}

export type OffsetTagProps =
  | OffsetTagDefaultKindProps
  | OffsetTagVectorKindProps
  | OffsetTagNoOffsetKindProps
  | OffsetTagHardCodedKindProps

export function OffsetTag(props: OffsetTagProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')

  // Ensure we never display "-0.0"
  const formatCoordinate = (value: number): string => {
    const formatted = value.toFixed(1)
    return formatted === '-0.0' ? '0.0' : formatted
  }

  const buildCopy = (): string => {
    switch (props.kind) {
      case 'default':
        return t('default')
      case 'hardcoded':
        return t('hardcoded')
      case 'noOffset':
        return t('no_offset_data')
      case 'vector': {
        const { x, y, z } = props

        return t('offset_values', {
          x: formatCoordinate(x),
          y: formatCoordinate(y),
          z: formatCoordinate(z),
        })
      }
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
