import memoizeOne from 'memoize-one'
import { writable } from 'svelte/store'
import { formatter } from './log-formatter'
import type {
  ClientMessage,
  FormattedMessage,
  LogColumnFormatter,
  LogFormatter,
  LogMessage,
  ServerMessage,
} from './types'

interface TailLogStore {
  mode: 'tail'
  count: number
  filter: string
  formatter: string
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
  formatter: string
  columns: string[]
  window: FormattedMessage[]
  latest: FormattedMessage[]
}
/**
 * A `LogStore` object contains all the state of the application.
 * It can be saved (e.g., to **localStorage**) and later used to restore the app to a known state) */
type LogStore = TailLogStore | StaticLogStore

const DEFAULT_WINDOW_SIZE = 100
const LATEST_LOG_WINDOW_SIZE = 2

function createLogStore(initialValue?: LogStore) {
  // use default values, if needed
  if (!initialValue) {
    initialValue = {
      mode: 'tail',
      count: 0,
      filter: '',
      formatter: formatter.getFormatter(),
      columns: [],
      maxMessages: DEFAULT_WINDOW_SIZE,
      window: [],
      latest: [],
    }
  }
  const { subscribe, update } = writable<LogStore>(initialValue)

  // @ts-ignore JSL_ENVIRONMENT is being replaced by @rollup/plugin-replace
  const serverAddress = JSL_ENVIRONMENT == 'production' ? window.location.host : 'localhost:8000'
  const ws = new WebSocket(`ws://${serverAddress}/`)
  ws.onopen = function () {
    console.log('WebSocket Client Connected')
    sendToServer({ mode: 'tail', filter: '', maxMessages: DEFAULT_WINDOW_SIZE })
  }
  ws.onmessage = function (e) {
    const msg = decode(e.data) as ServerMessage
    update(currentValue => {
      const columns = Object.keys(parseFormatter(currentValue.formatter))
      const logFormatter = formatLogMessage(currentValue.formatter)
      if (msg.type === 'init') {
        if (msg.mode === 'tail') {
          return {
            mode: msg.mode,
            count: msg.window.size,
            filter: currentValue.filter,
            formatter: currentValue.formatter,
            columns,
            maxMessages: currentValue.maxMessages,
            window: msg.window.messages.map(logFormatter),
            latest: [],
          }
        } else if (msg.mode === 'static') {
          return {
            mode: msg.mode,
            count: msg.window.size,
            filter: currentValue.filter,
            formatter: currentValue.formatter,
            columns,
            offsetStart: msg.window.offsetStart,
            maxMessages: msg.window.maxMessages,
            window: msg.window.messages.map(logFormatter),
            latest: [],
          }
        }
      } else if (msg.type === 'update') {
        if (currentValue.mode === 'tail') {
          return {
            ...currentValue,
            count: msg.size,
            window: [
              ...currentValue.window.slice(-currentValue.maxMessages + 1),
              logFormatter(msg.message),
            ],
          }
        } else if (currentValue.mode === 'static') {
          return {
            ...currentValue,
            count: msg.size,
            latest: [
              ...currentValue.latest.slice(-LATEST_LOG_WINDOW_SIZE),
              logFormatter(msg.message),
            ],
          }
        }
      }
    })
  }

  const sendToServer = (msg: ClientMessage) => ws.send(encode(msg))

  return {
    subscribe,
    resizeWindow: (newSize: number, rowHeight: number) => {
      const maxMessages = Math.ceil(newSize / rowHeight)
      update(state => {
        if (state.mode == 'tail') {
          sendToServer({
            mode: state.mode,
            maxMessages,
            filter: state.filter,
          })
        } else if (state.mode == 'static') {
          sendToServer({
            mode: state.mode,
            offsetStart: state.offsetStart,
            maxMessages,
            filter: state.filter,
          })
        }
        return { ...state, maxMessages }
      })
    },
    changeFilter: (newFilter: string) => {
      update(state => {
        if (state.mode == 'tail') {
          sendToServer({
            mode: state.mode,
            maxMessages: state.maxMessages,
            filter: newFilter,
          })
        } else if (state.mode == 'static') {
          sendToServer({
            mode: state.mode,
            offsetStart: state.offsetStart,
            maxMessages: state.maxMessages,
            filter: newFilter,
          })
        }
        return {
          ...state,
          filter: newFilter,
        }
      })
    },
    changeToTail: () => {
      update(state => {
        sendToServer({ mode: 'tail', maxMessages: state.maxMessages, filter: state.filter })
        return {
          ...state,
          mode: 'tail',
        }
      })
    },
    changeToStatic: (offsetStart: number) => {
      update(state => {
        sendToServer({
          mode: 'static',
          offsetStart,
          maxMessages: state.maxMessages,
          filter: state.filter,
        })
        return {
          ...state,
          mode: 'static',
          offsetStart,
        }
      })
    },
    changeFormatter: (newFormatter: string) => {
      update(state => {
        // re-fetch data from the server so it can be formatted with the new formatter
        if (state.mode == 'tail') {
          sendToServer({
            mode: state.mode,
            maxMessages: state.maxMessages,
            // offset: state.mode == 'static' ? state.offset : undefined,
            filter: state.filter,
          })
        } else if (state.mode == 'static') {
          sendToServer({
            mode: state.mode,
            offsetStart: state.offsetStart,
            maxMessages: state.maxMessages,
            filter: state.filter,
          })
        }

        // save the new formatter
        formatter.updateFormatter(newFormatter)
        return {
          ...state,
          formatter: newFormatter,
        }
      })
    },
    resetFormatter: () => {
      update(state => ({
        ...state,
        formatter: formatter.resetFormatter(),
      }))
    },
  }
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

const parseFormatter = memoizeOne(
  (formatter: string): LogFormatter => {
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
  },
)

const logStore = createLogStore()
export { logStore, formatLogMessage, parseFormatter }
export type { LogStore }
