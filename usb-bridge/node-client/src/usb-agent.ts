import * as http from 'http'
import agent from 'agent-base'
import type { Duplex } from 'stream'

import { SerialPort } from 'serialport'

import type { AgentOptions } from 'http'
import type { PortInfo } from '@serialport/bindings-cpp'
import type { Logger, LogLevel } from './types'

export type { PortInfo }

export interface SerialPortListMonitorConfig {
  /** Call the health endpoints for a given IP once every `interval` ms */
  interval?: number
}

/**
 * A serial port list monitor that can be started and stopped as needed
 */
export interface SerialPortListMonitor {
  /** Start monitoring available serial ports  */
  start: (config: SerialPortListMonitorConfig) => void
  /** Stop monitoring available serial ports */
  stop: () => void
}

interface SerialPortListMonitorOptions {
  /** Function to call whenever the requests for serial ports settle */
  onSerialPortFetch?: (list: PortInfo[]) => void
  /** Optional logger */
  logger?: Logger
}

export function buildUSBAgent(opts: { serialPort: string }): http.Agent {
  console.log(`path is ${opts.serialPort}`)
  const port = new SerialPort({ path: opts.serialPort, baudRate: 115200 })
  const usbAgent = agent(
    (req: http.ClientRequest, opts: http.RequestOptions): Duplex => {
      if (!port.isOpen) port.open()
      return port
    }
  )

  usbAgent.maxFreeSockets = 1
  usbAgent.maxSockets = 1
  usbAgent.maxTotalSockets = 1
  usbAgent.destroy = () => port.close()
  return usbAgent
}

export function fetchSerialPortList(): Promise<PortInfo[]> {
  return SerialPort.list()
}

export function createSerialPortListMonitor(
  options: SerialPortListMonitorOptions
): SerialPortListMonitor {
  const { onSerialPortFetch, logger } = options
  const log = (
    level: LogLevel,
    msg: string,
    meta: Record<string, unknown> = {}
  ): void => {
    typeof logger?.[level] === 'function' && logger[level](msg, meta)
  }

  let interval = 0
  let serialPortPollIntervalId: NodeJS.Timeout | null = null

  function start(config: SerialPortListMonitorConfig): void {
    const { interval: nextInterval } = config ?? {}
    let needsNewSerialPortInterval = serialPortPollIntervalId === null

    if (nextInterval != null && nextInterval !== interval) {
      interval = nextInterval
      needsNewSerialPortInterval = true
    }

    if (needsNewSerialPortInterval && interval > 0) {
      const handlePoll = (): void => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        fetchSerialPortList().then((list: PortInfo[]) => {
          onSerialPortFetch?.(list)
        })
      }

      stop()
      log('debug', 'starting new serial port poll interval')
      serialPortPollIntervalId = setInterval(handlePoll, interval)
    } else {
      log(
        'debug',
        'serial port poller (re)start called but no new interval needed'
      )
    }
  }

  function stop(): void {
    log('debug', 'stopping serial port poller')
    if (serialPortPollIntervalId != null) {
      clearInterval(serialPortPollIntervalId)
    }
    serialPortPollIntervalId = null
  }

  return { start, stop }
}

class SerialPortSocket extends SerialPort {
  // added these to squash keepAlive errors
  setKeepAlive(): void {}
  unref(): void {}
  setTimeout(): void {}
  ref(): void {}

  // log on
  on(...args: any): any {
    console.log('serialport on', ...args)
    return super.on(...args)
  }

  // log emit
  emit(type: string, ...args: any): boolean {
    console.log('serialport emitted', type)
    return super.emit(type, ...args)
  }

  // log cork
  cork(...args: any): any {
    console.log('serialport cork', args)
    return super.cork()
  }

  // log uncork
  uncork(...args: any): any {
    console.log('serialport uncork', args)
    return super.uncork()
  }
}

interface SerialPortHttpAgentOptions extends AgentOptions {
  path: string
}

class SerialPortHttpAgent extends http.Agent {
  constructor(options: SerialPortHttpAgentOptions) {
    super(options)
    this.options = options
  }

  options: { path: string } = { path: '' }

  // copied from _http_agent.js, replacing this.createConnection
  createSocket(req, options, cb) {
    console.log('called createSocket with options', options)
    options = { __proto__: null, ...options, ...this.options }
    if (options.socketPath) options.path = options.socketPath
    if (!options.servername && options.servername !== '')
      options.servername = calculateServerName(options, req)
    const name = this.getName(options)
    options._agentKey = name
    // debug("createConnection", name, options);
    options.encoding = null
    const oncreate = once((err, s) => {
      if (err) return cb(err)
      if (!this.sockets[name]) {
        this.sockets[name] = []
      }
      Array.prototype.push(this.sockets[name], s)
      this.totalSocketCount++
      // debug("sockets", name, this.sockets[name].length, this.totalSocketCount);
      installListeners(this, s, options)
      cb(null, s)
      console.log('oncreate totalSocketCount', this.totalSocketCount)
    })
    // TODO(BTH: what does this do without createConnection?)
    // When keepAlive is true, pass the related options to createConnection
    // if (this.keepAlive) {
    //   options.keepAlive = this.keepAlive;
    //   options.keepAliveInitialDelay = this.keepAliveMsecs;
    // }
    console.log('creating socket this.options', this.options)
    const socket = new SerialPortSocket({
      path: this.options.path,
      baudRate: 115200,
    })
    if (!socket.isOpen && !socket.opening) {
      socket.open()
    }
    const originalRead = socket.read.bind(socket)
    const originalWrite = socket.write.bind(socket)
    const originalClose = socket.close.bind(socket)
    const originalPause = socket.pause.bind(socket)
    const originalEnd = socket.end.bind(socket)
    const originalDestroy = socket.destroy.bind(socket)
    const originalPush = socket.push.bind(socket)
    const originalUnshift = socket.unshift.bind(socket)
    socket.on('data', chunk => {
      console.log(`received chunk:  ${chunk}`)
      console.log('end chunk')
    })
    socket.on('free', () => {
      console.log('socket free writableEnded', socket.writableEnded)
      // socket.close();
    })
    socket.on('prefinish', () => {
      console.log(
        'socket prefinishing isOpen writableFinished writableEnded',
        socket.isOpen,
        socket.writableFinished,
        socket.writableEnded
      )
    })
    socket.on('finish', () => {
      console.log(
        'socket finishing isOpen writableFinished writableEnded',
        socket.isOpen,
        socket.writableFinished,
        socket.writableEnded
      )
      // close socket on finish: allows agent to create another socket and requests to continue
      socket.close()
    })
    socket.on('end', () => {
      console.log(
        'socket ending isOpen writableFinished writableEnded',
        socket.isOpen,
        socket.writableFinished,
        socket.writableEnded
      )
    })
    socket.read = (...args) => {
      console.log(`calling read with: ${args}`)
      const result = originalRead(...args)
      console.log(
        `read result: ${result}`,
        'socket._readableState',
        socket._readableState
      )
      return result
    }
    socket.write = (...args) => {
      console.log(`calling write with: ${args}`)
      const result = originalWrite(...args)
      console.log(`write result: ${result}`)
      return result
    }
    socket.close = (...args) => {
      console.log(`calling close with: ${args}`)
      const result = originalClose(...args)
      console.log(`close result: ${result}`)
      return result
    }
    socket.pause = (...args) => {
      console.log(`calling pause with: ${args}`)
      const result = originalPause(...args)
      return result
    }
    socket.end = (...args: any) => {
      // .caller doesn't work but throws a useful stack trace
      // console.log(`${socket.end.caller} called end with: ${args}`)
      console.log(`calling end with: ${args}`)
      const result = originalEnd(...args)
      return result

      // original end emits prefinish/finish, signaling no more data to be written. We want to keep the writable stream open.
      // https://nodejs.org/api/stream.html#writableendchunk-encoding-callback
      // return socket
    }
    socket.destroy = (...args) => {
      console.log(`calling destroy with: ${args}`)
      const result = originalDestroy(...args)
      return result
    }
    socket.push = (...args) => {
      console.log(`calling push with: ${args}`)
      const result = originalPush(...args)
      return result
    }
    socket.unshift = (...args) => {
      console.log(`calling unshift with: ${args}`)
      const result = originalUnshift(...args)
      return result
    }
    if (socket) oncreate(null, socket)
  }
}

// copied from internal/util.js
function once(callback) {
  let called = false
  return function (...args) {
    if (called) return
    called = true
    return Reflect.apply(callback, this, args)
  }
}

// copied from _http_agent.js
function installListeners(agent, s, options) {
  function onFree() {
    // debug('CLIENT socket onFree');
    // need to emit free to attach listeners to serialport
    agent.emit('free', s, options)
  }
  s.on('free', onFree)

  function onClose(err) {
    // debug('CLIENT socket onClose');
    // This is the only place where sockets get removed from the Agent.
    // If you want to remove a socket from the pool, just close it.
    // All socket errors end in a close event anyway.
    agent.totalSocketCount--
    agent.removeSocket(s, options)
    console.log('onClose totalSocketCount', agent.totalSocketCount)
  }
  s.on('close', onClose)

  function onTimeout() {
    // debug('CLIENT socket onTimeout');

    // Destroy if in free list.
    // TODO(ronag): Always destroy, even if not in free list.
    const sockets = agent.freeSockets
    if (
      Array.prototype.some(Object.keys(sockets), name =>
        Array.prototype.includes(sockets[name], s)
      )
    ) {
      return s.destroy()
    }
  }
  s.on('timeout', onTimeout)

  function onRemove() {
    // We need this function for cases like HTTP 'upgrade'
    // (defined by WebSockets) where we need to remove a socket from the
    // pool because it'll be locked up indefinitely
    // debug('CLIENT socket onRemove');
    agent.totalSocketCount--
    agent.removeSocket(s, options)
    s.removeListener('close', onClose)
    s.removeListener('free', onFree)
    s.removeListener('timeout', onTimeout)
    s.removeListener('agentRemove', onRemove)
    console.log('onRemove totalSocketCount', agent.totalSocketCount)
  }
  s.on('agentRemove', onRemove)

  if (agent[kOnKeylog]) {
    s.on('keylog', agent[kOnKeylog])
  }
}

const kOnKeylog = Symbol('onkeylog')

export { SerialPortHttpAgent }
