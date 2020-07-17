// @flow
import type { Mount } from '@opentrons/components'
import type {
  SessionCommandString,
  SessionCommandData,
  Session,
} from '../../sessions/types'

export type CalibrateTipLengthParentProps = {|
  isMulti: boolean,
  mount: Mount,
  probed: boolean,
  robotName: string | null,
  session: Session,
|}

export type CalibrateTipLengthChildProps = {|
  ...CalibrateTipLengthParentProps,
  hasBlock: boolean | null,
  sendSessionCommand: (
    command: SessionCommandString,
    data: SessionCommandData
  ) => void,
|}
