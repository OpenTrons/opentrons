// TODO(mc, 2020-03-20): Popper build misconfigured, but can import types directly
// https://github.com/popperjs/popper-core/issues/1031
import type {
  Instance as PopperInstance,
  Options as PopperOptions,
} from '@popperjs/core/lib/types'

import type { UseHoverOptions, HoverHandlers } from '../interaction-enhancers'

export type Placement = PopperOptions['placement']

export type Strategy = PopperOptions['strategy']

export type { PopperInstance, PopperOptions }

export type HandleStateUpdate = (
  placement: Placement,
  styles: {
    popper?: Partial<CSSStyleDeclaration>
    arrow?: Partial<CSSStyleDeclaration>
  }
) => void

export interface UsePopperOptions {
  target: Element | null
  tooltip: HTMLElement | null
  arrow: HTMLElement | null
  onStateUpdate: HandleStateUpdate
  placement?: Placement | null
  strategy?: Strategy | null
  offset?: number
}

export type UsePopperResult = PopperInstance | null

export type UseTooltipOptions = Partial<{
  placement?: Placement
  strategy?: Strategy
  offset?: number
}>

export interface UseTooltipResultTargetProps {
  ref: React.Ref<Element>
  'aria-describedby': string
}

export interface UseTooltipResultTooltipProps {
  id: string
  ref: React.Ref<HTMLElement>
  placement: Placement | null
  style: Partial<CSSStyleDeclaration>
  arrowRef: React.Ref<HTMLElement>
  arrowStyle: Partial<CSSStyleDeclaration>
}

export type UseTooltipResult = [
  UseTooltipResultTargetProps,
  UseTooltipResultTooltipProps
]

export type UseHoverTooltipOptions = Partial<
  UseTooltipOptions & UseHoverOptions
>

export type UseHoverTooltipTargetProps = UseTooltipResultTargetProps &
  HoverHandlers

export type UseHoverTooltipResult = [
  UseHoverTooltipTargetProps,
  Partial<UseTooltipResultTooltipProps & { visible: boolean }>
]
