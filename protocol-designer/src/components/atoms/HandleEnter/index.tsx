import { HandleKeypress } from '@opentrons/components'
import type { ReactNode } from 'react'

interface HandleEnterProps {
  children: ReactNode
  onEnter: () => void
}

export function HandleEnter(props: HandleEnterProps): JSX.Element {
  const { children, onEnter } = props

  return (
    <HandleKeypress
      preventDefault
      handlers={[
        {
          key: 'Enter',
          shiftKey: false,
          onPress: onEnter,
        },
      ]}
    >
      {children}
    </HandleKeypress>
  )
}
