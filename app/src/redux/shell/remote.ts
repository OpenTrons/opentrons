// access main process remote modules via attachments to `global`
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import type {
  Remote,
  NotifyTopic,
  NotifyResponseData,
  IPCSafeFormData,
} from './types'

const emptyRemote: Remote = {} as any

export const remote: Remote = new Proxy(emptyRemote, {
  get(_target, propName: string): unknown {
    console.assert(
      (global as any).APP_SHELL_REMOTE,
      'Expected APP_SHELL_REMOTE to be attached to global scope; is app-shell/src/preload.ts properly configured?'
    )

    console.assert(
      propName in (global as any).APP_SHELL_REMOTE,
      `Expected APP_SHELL_REMOTE.${propName} to exist, is app-shell/src/preload.ts properly configured?`
    )
    return (global as any).APP_SHELL_REMOTE[propName] as Remote
  },
})

// FormData and File objects can't be sent through invoke().
// This converts them into simpler objects that can be.
// app-shell will convert them back.
async function proxyFormData(formData: FormData): Promise<IPCSafeFormData> {
  const result: IPCSafeFormData = []
  for (const [name, value] of formData.entries()) {
    if (value instanceof File) {
      result.push({
        type: 'file',
        name,
        // todo(mm, 2024-04-24): Send just the (full) filename instead of the file
        // contents, to avoid the IPC message ballooning into several MB.
        value: await value.arrayBuffer(),
        filename: value.name,
      })
    } else {
      result.push({ type: 'string', name, value })
    }
  }

  return result
}

export async function appShellRequestor<Data>(
  config: AxiosRequestConfig
): Promise<AxiosResponse<Data>> {
  const { data } = config
  const formDataProxy =
    data instanceof FormData
      ? { proxiedFormData: await proxyFormData(data) }
      : data
  const configProxy = { ...config, data: formDataProxy }

  const result = await remote.ipcRenderer.invoke('usb:request', configProxy)
  if (result?.error != null) {
    throw result.error
  }
  return result
}

interface CallbackStore {
  [hostname: string]: {
    [topic in NotifyTopic]: Array<(data: NotifyResponseData) => void>
  }
}
const callbackStore: CallbackStore = {}

interface AppShellListener {
  hostname: string
  notifyTopic: NotifyTopic
  callback: (data: NotifyResponseData) => void
  isDismounting?: boolean
}
export function appShellListener({
  hostname,
  notifyTopic,
  callback,
  isDismounting = false,
}: AppShellListener): CallbackStore {
  // The shell emits general messages to ALL_TOPICS, typically errors, and all listeners must handle those messages.
  const topics: NotifyTopic[] = [notifyTopic, 'ALL_TOPICS'] as const

  topics.forEach(topic => {
    if (isDismounting) {
      const callbacks = callbackStore[hostname]?.[topic]
      if (callbacks != null) {
        callbackStore[hostname][topic] = callbacks.filter(cb => cb !== callback)
        if (!callbackStore[hostname][topic].length) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete callbackStore[hostname][topic]
          if (!Object.keys(callbackStore[hostname]).length) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete callbackStore[hostname]
          }
        }
      }
    } else {
      callbackStore[hostname] = callbackStore[hostname] ?? {}
      callbackStore[hostname][topic] ??= []
      callbackStore[hostname][topic].push(callback)
    }
  })

  return callbackStore
}
// Instantiate the notify listener at runtime.
remote.ipcRenderer.on(
  'notify',
  (_, shellHostname, shellTopic, shellMessage) => {
    callbackStore[shellHostname]?.[shellTopic]?.forEach(cb => {
      cb(shellMessage)
    })
  }
)
