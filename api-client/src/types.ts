import type { AxiosRequestConfig } from 'axios'
import type { ResponsePromise } from './request'
import type { AddressableAreaName, ModuleModel } from '@opentrons/shared-data'

export interface HostConfig {
  hostname: string
  requestor?: <ResData>(config: AxiosRequestConfig) => ResponsePromise<ResData>
  port?: number | null
  robotName?: string | null
  token?: string
}

export interface ResourceLink {
  href: string
  meta?: Partial<{ [key: string]: string | null | undefined }>
}

export type ResourceLinks = Record<
  string,
  ResourceLink | string | null | undefined
>

export interface ErrorDetails {
  id: string
  title: string
  detail: string
  source?: {
    pointer?: string
    parameter?: string
    header?: string
  }
}

export interface ErrorResponse {
  links?: ResourceLinks
  errors: ErrorDetails[]
}

export interface EmptyResponse {
  links?: ResourceLinks
  data: null
}

export interface BaseOffsetLocationSequenceComponent {
  kind: string
}

export interface OnLabwareOffsetLocationSequenceComponent
  extends BaseOffsetLocationSequenceComponent {
  kind: 'onLabware'
  labwareUri: string
}

export interface OnModuleOffsetLocationSequenceComponent
  extends BaseOffsetLocationSequenceComponent {
  kind: 'onModule'
  moduleModel: ModuleModel
}

export interface OnAddressableAreaOffsetLocationSequenceComponent
  extends BaseOffsetLocationSequenceComponent {
  kind: 'onAddressableArea'
  addressableAreaName: AddressableAreaName
}

export type LabwareOffsetLocationSequenceComponent =
  | OnAddressableAreaOffsetLocationSequenceComponent
  | OnModuleOffsetLocationSequenceComponent
  | OnLabwareOffsetLocationSequenceComponent
export type LabwareOffsetLocationSequence = LabwareOffsetLocationSequenceComponent[]
