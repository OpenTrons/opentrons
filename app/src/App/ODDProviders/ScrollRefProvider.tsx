import { createContext, useCallback, useState } from 'react'
import type { FC, ReactNode } from 'react'

export interface SharedScrollRefContextType {
  refCallback: (node: HTMLElement | null) => void
  element: HTMLElement | null
}

export const SharedScrollRefContext = createContext<SharedScrollRefContextType | null>(
  null
)

// This provider exists to capture the ref of the main scrollable Box element in the ODD
// This is so that we can do things like auto scroll (using the ref) across components
export const SharedScrollRefProvider: FC<{
  children: ReactNode
}> = ({ children }) => {
  const [element, setCurrentElement] = useState<HTMLElement | null>(null)

  // Callback ref that updates both the state and the ref
  // This is necessary because we need a ref to be attached to the DOM
  // But also refs don't trigger rerenders, which we need in order to detect scrolling
  const refCallback = useCallback((node: HTMLElement | null) => {
    setCurrentElement(node)
  }, [])

  return (
    <SharedScrollRefContext.Provider value={{ refCallback, element }}>
      {children}
    </SharedScrollRefContext.Provider>
  )
}
