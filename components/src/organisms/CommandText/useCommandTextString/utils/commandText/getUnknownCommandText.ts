import type { GetCommandText } from '../..'

export function getUnknownCommandText({ command }: GetCommandText): string {
  return JSON.stringify(command)
}
