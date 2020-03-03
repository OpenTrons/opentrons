// flow-typed signature: 64b974de32ef9248e7a0f5481af8f4bd
// flow-typed version: <<STUB>>/form-data_v2.5.0/flow_v0.102.0

/**
 * This is an autogenerated libdef stub for:
 *
 *   'form-data'
 *
 * Fill this stub out by replacing all the `any` types.
 *
 * Once filled out, we encourage you to share your work with the
 * community by sending a pull request to:
 * https://github.com/flowtype/flow-typed
 */

import ReadableStream from 'stream'

declare module 'form-data' {
  declare class _FormData extends FormData {
    append(name: string, data: ReadableStream, filename?: string): void;
  }

  declare export default typeof _FormData
}
