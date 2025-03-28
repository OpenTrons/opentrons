// render using targetted component using @testing-library/react
// with wrapping providers for i18next and redux
import { QueryClient, QueryClientProvider } from 'react-query'
import { I18nextProvider } from 'react-i18next'
import { render } from '@testing-library/react'

import { useHydrateAtoms } from 'jotai/utils'
import { Provider } from 'jotai'

import type {
  ComponentProps,
  ComponentType,
  PropsWithChildren,
  ReactElement,
  ReactNode,
} from 'react'
import type { RenderOptions, RenderResult } from '@testing-library/react'

interface HydrateAtomsProps {
  initialValues: Array<[any, any]>
  children: ReactNode
}

interface TestProviderProps {
  initialValues: Array<[any, any]>
  children: ReactNode
}

const HydrateAtoms = ({
  initialValues,
  children,
}: HydrateAtomsProps): ReactNode => {
  useHydrateAtoms(initialValues)
  return children
}

export const TestProvider = ({
  initialValues,
  children,
}: TestProviderProps): ReactNode => (
  <Provider>
    <HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
  </Provider>
)

export interface RenderWithProvidersOptions extends RenderOptions {
  initialValues?: Array<[any, any]>
  i18nInstance: ComponentProps<typeof I18nextProvider>['i18n']
}

export function renderWithProviders(
  Component: ReactElement,
  options?: RenderWithProvidersOptions
): RenderResult {
  const { i18nInstance = null, initialValues = [] } = options ?? {}

  const queryClient = new QueryClient()

  const ProviderWrapper: ComponentType<
    PropsWithChildren<Record<string, unknown>>
  > = ({ children }) => {
    const BaseWrapper = (
      <QueryClientProvider client={queryClient}>
        <TestProvider initialValues={initialValues}>{children}</TestProvider>
      </QueryClientProvider>
    )
    if (i18nInstance != null) {
      return (
        <I18nextProvider i18n={i18nInstance}>{BaseWrapper}</I18nextProvider>
      )
    } else {
      return BaseWrapper
    }
  }

  return render(Component, { wrapper: ProviderWrapper, ...options })
}
