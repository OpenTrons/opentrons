import { useEffect, useRef } from 'react'
import assert from 'assert'

import type { MouseEvent, ReactNode } from 'react'

export interface UseOnClickOutsideOptions {
  onClickOutside?: () => void
}

export const useOnClickOutside = <E extends Element>(
  options: UseOnClickOutsideOptions
): { current: E | null } => {
  const { onClickOutside } = options
  const node: { current: E | null } = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): (() => void) => {
      const clickedElem = event.target

      assert(
        clickedElem instanceof Node,
        'expected clicked element to be Node - something went wrong in onClickOutside hook'
      )

      if (
        onClickOutside &&
        node &&
        node.current &&
        node.current.contains &&
        !node.current.contains(clickedElem as ReactNode)
      ) {
        onClickOutside(event)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClickOutside])

  return node
}
