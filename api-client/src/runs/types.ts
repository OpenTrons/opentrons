export const RUN_TYPE_BASIC: 'basic' = 'basic'
export const RUN_TYPE_PROTOCOL: 'protocol' = 'protocol'

export type RunType = typeof RUN_TYPE_BASIC | typeof RUN_TYPE_PROTOCOL

// TODO(bc, 2021-10-25): flesh out the real BasicRun model once api settles
interface BasicRun {
  id: string
  runType: typeof RUN_TYPE_BASIC
  createParams: Record<string, unknown>
}

// TODO(bc, 2021-10-25): flesh out the real ProtocolRun model once api settles
interface ProtocolRun {
  id: string
  runType: typeof RUN_TYPE_PROTOCOL
  createParams: Record<string, unknown>
}

export type RunData = BasicRun | ProtocolRun

interface ResourceLink {
  href: string
  meta?: Partial<{ [key: string]: string | null | undefined }>
}

type ResourceLinks = Record<string, ResourceLink | string | null | undefined>

export interface Run {
  data: RunData
  links?: ResourceLinks
}

export interface Runs {
  data: RunData[]
  links?: ResourceLinks
}
