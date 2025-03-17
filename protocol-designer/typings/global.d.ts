declare const global: typeof globalThis & {
  document: {
    getElementsByClassName: (val: string) => any[]
  }
  enablePrereleaseMode: () => void
}

interface Window {
  __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: (val: string) => any
}

declare module '*.md' {
  const content: string
  export { content }
}
