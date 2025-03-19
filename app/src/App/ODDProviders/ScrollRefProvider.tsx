import { createContext, useCallback, useState } from 'react'

export interface SharedScrollRefContextType {
  refCallback: (node: HTMLElement | null) => void
  element: HTMLElement | null
}

export const SharedScrollRefContext = createContext<SharedScrollRefContextType | null>(
  null
)

export const SharedScrollRefProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [element, setCurrentElement] = useState<HTMLElement | null>(null)

  // Callback ref that updates both the state and the ref
  // This is necessary because we need a ref to be attached to the DOM
  // But also refs don't trigger rerenders, which we need in order to detect scrolling
  const refCallback = useCallback((node: HTMLElement | null) => {
    console.log('calling refCallback')
    setCurrentElement(node)
  }, [])

  return (
    <SharedScrollRefContext.Provider value={{ refCallback, element }}>
      {children}
    </SharedScrollRefContext.Provider>
  )
}
