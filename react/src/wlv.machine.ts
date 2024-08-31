import { Transition, TransitionWithParams, useMachine } from '@rjbma/ts-state-machine'
import { FormatterConfig, formatter } from './log-formatter'
import {
  ClientMessage,
  FormattedMessage,
  LogColumnFormatter,
  LogFormatter,
  LogMessage,
  ServerMessage,
} from './types'
import { assertExhaustive } from './utils'
import memoizeOne from 'memoize-one'

const DEFAULT_WINDOW_SIZE = 100
const LATEST_LOG_WINDOW_SIZE = 2

interface TailLogStore {
  mode: 'tail'
  count: number
  filter: string
  formatter: FormatterConfig
  columns: string[]
  maxMessages: number
  window: FormattedMessage[]
  latest: FormattedMessage[]
}
interface StaticLogStore {
  mode: 'static'
  offsetStart: number
  maxMessages: number
  count: number
  filter: string
  formatter: FormatterConfig
  columns: string[]
  window: FormattedMessage[]
  latest: FormattedMessage[]
}
/**
 * A `LogStore` object contains all the state of the application.
 * It can be saved (e.g., to **localStorage**) and later used to restore the app to a known state) */
type LogStore = TailLogStore | StaticLogStore

type State =
  | {
      status: 'Initializing'
      sendToServer: (msg: ClientMessage) => void
    }
  | ({
      status: 'Ready'
      sendToServer: (msg: ClientMessage) => void
    } & LogStore)
  | {
      status: 'Disconnected'
      sendToServer: (msg: ClientMessage) => void
    }

type Transitions = {
  initialize: TransitionWithParams<State, any, 'Ready', { msg: ServerMessage & { type: 'init' } }>
  disconnect: Transition<State, any, 'Disconnected'>
  newMessage: TransitionWithParams<
    State,
    'Ready',
    'Ready',
    { msg: ServerMessage & { type: 'update' } }
  >
  scroll: TransitionWithParams<State, 'Ready', 'Ready', { element: Element }>
  // reconnect: Transition<State, 'Disconnected', 'Initializing'>
}

const transitions: Transitions = {
  initialize: (current, { msg }) => {
    const fmt = formatter.getFormatter()
    const columns = Object.keys(parseFormatter(fmt.fn))
    const logFormatter = formatLogMessage(fmt.fn)
    if (msg.mode === 'tail') {
      return {
        status: 'Ready',
        sendToServer: current.sendToServer,
        mode: msg.mode,
        count: msg.window.size,
        filter: '',
        formatter: fmt,
        columns,
        maxMessages: DEFAULT_WINDOW_SIZE,
        window: msg.window.messages.map(logFormatter),
        latest: [],
      }
    } else if (msg.mode === 'static') {
      return {
        status: 'Ready',
        sendToServer: current.sendToServer,
        mode: msg.mode,
        count: msg.window.size,
        filter: '',
        formatter: fmt,
        columns,
        offsetStart: msg.window.offsetStart,
        maxMessages: msg.window.maxMessages,
        window: msg.window.messages.map(logFormatter),
        latest: [],
      }
    } else {
      throw assertExhaustive(msg)
    }
  },
  newMessage: (current, { msg }) => {
    const logFormatter = formatLogMessage(current.formatter.fn)
    if (current.mode === 'tail') {
      return {
        ...current,
        count: msg.size,
        window: [...current.window.slice(-current.maxMessages + 1), logFormatter(msg.message)],
      }
    } else if (current.mode === 'static') {
      return {
        ...current,
        count: msg.size,
        latest: [...current.latest.slice(-LATEST_LOG_WINDOW_SIZE), logFormatter(msg.message)],
      }
    } else {
      throw assertExhaustive(current)
    }
  },
  disconnect: current => ({
    status: 'Disconnected',
    sendToServer: current.sendToServer,
  }),
  scroll: (current, { element }) => {
    const isScrolledToBottom = (el: Element) =>
      Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 10

    /**
     * Calculate the seq the user has offset to, and requet data from the server around that offset.
     */
    const el = element
    if (isScrolledToBottom(el)) {
      current.sendToServer({
        mode: 'tail',
        maxMessages: current.maxMessages,
        filter: current.filter,
      })
      return {
        ...current,
        mode: 'tail',
      }
    } else {
      const percStart = el.scrollTop / el.scrollHeight
      const offsetStart = Math.floor(percStart * current.count)
      current.sendToServer({
        mode: 'static',
        offsetStart,
        maxMessages: current.maxMessages,
        filter: current.filter,
      })
      return {
        ...current,
        mode: 'static',
        offsetStart,
      }
    }
  },
}

const serverAddress = 'localhost:8000'
const ws = new WebSocket(`ws://${serverAddress}/`)

function useLogViewerMachine() {
  const sendToServer = (msg: ClientMessage) => ws.send(encode(msg))
  const machine = useMachine<State, Transitions, {}>(
    transitions,
    {},
    { status: 'Initializing', sendToServer },
  )

  ws.onopen = function () {
    console.log('WebSocket Client Connected')
    sendToServer({ mode: 'tail', filter: '', maxMessages: DEFAULT_WINDOW_SIZE })
  }

  ws.onmessage = function (e) {
    const msg = decode(e.data) as ServerMessage
    if (msg.type == 'init') {
      machine.transitions.initialize(machine.state, { msg: msg })
    } else if (msg.type == 'update' && machine.state.status == 'Ready') {
      machine.transitions.newMessage(machine.state, { msg: msg })
    }
  }

  ws.onclose = () => transitions.disconnect(machine.state)

  return machine
}

const encode = (data: any) => JSON.stringify(data)
const decode = (data: string) => JSON.parse(data)
const formatLogMessage = (formatterStr: string) => {
  const formatter = parseFormatter(formatterStr)
  return (msg: LogMessage): FormattedMessage => ({
    seq: msg.seq,
    rawMessage: msg.data,
    formattedMessage: Object.keys(formatter).reduce(
      (acc, key) => ({
        ...acc,
        [key]: execFn(formatter[key], msg),
      }),
      {},
    ),
  })
}

const execFn = (fn: LogColumnFormatter, msg: LogMessage) => {
  try {
    const res = fn(msg.data, msg.seq)
    return res == undefined ? '' : res
  } catch (err) {
    return ''
  }
}

const parseFormatter = memoizeOne((formatter: string): LogFormatter => {
  let result
  try {
    result = eval(formatter)
  } catch (err) {
    throw err
    // console.error('Invalid formatter object. Reverting to default format')
    // console.log(err)
    // result = eval(DEFAULT_LOG_FORMATTER)
  }
  return result
})

export { useLogViewerMachine }
export type { LogStore }
