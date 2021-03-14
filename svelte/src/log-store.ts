import memoizeOne from 'memoize-one'
import { writable } from 'svelte/store'
import type {
  FormattedMessage,
  LogColumnFormatter,
  LogFormatter,
  LogMessage,
  ServerMessage,
} from './types'

interface TailLogStore {
  mode: 'tail'
  count: number
  formatter: string
  columns: string[]
  window: FormattedMessage[]
  latest: FormattedMessage[]
}
interface StaticLogStore {
  mode: 'static'
  offsetSeq: number
  count: number
  formatter: string
  columns: string[]
  window: FormattedMessage[]
  latest: FormattedMessage[]
}
/**
 * A `LogStore` object contains all the state of the application.
 * It can be saved (e.g., to **localStorage**) and later used to restore the app to a known state) */
type LogStore = TailLogStore | StaticLogStore

const LOG_WINDOW_SIZE = 100
const LATEST_LOG_WINDOW_SIZE = 2
const DEFAULT_LOG_FORMATTER = `
  ({
    '#': (l, seq) => seq,
    level: l => l.level,
    timestamp: l => l.timestamp.substring(0, 19).replace('T', ' '),
    message: l => l.message,
    bank: l => l.additionalInfo.bankName,
    url: l => l.additionalInfo.url,
  })`

function createLogStore(initialValue?: LogStore) {
  // use default values, if needed
  if (!initialValue) {
    initialValue = {
      mode: 'tail',
      count: 0,
      formatter: DEFAULT_LOG_FORMATTER,
      columns: [],
      window: [],
      latest: [],
    }
  }
  const { subscribe, update } = writable<LogStore>(initialValue)

  const ws = new WebSocket('ws://localhost:3000/')
  ws.onopen = function () {
    console.log('WebSocket Client Connected')
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
            count: msg.size,
            formatter: currentValue.formatter,
            columns,
            window: msg.window.map(logFormatter),
            latest: [],
          }
        } else if (msg.mode === 'static') {
          return {
            mode: msg.mode,
            count: msg.size,
            formatter: currentValue.formatter,
            columns,
            window: msg.window.map(logFormatter),
            offsetSeq: msg.window.length ? msg.window[0].seq : 0,
            latest: [],
          }
        }
      } else if (msg.type === 'update') {
        if (currentValue.mode === 'tail') {
          return {
            ...currentValue,
            count: msg.size,
            window: [...currentValue.window.slice(-LOG_WINDOW_SIZE), logFormatter(msg.message)],
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

  return {
    subscribe,
    changeToTail: () => {
      update(state => ({
        ...state,
        mode: 'tail',
        offsetSeq: undefined,
      }))

      ws.send(encode({ mode: 'tail' }))
    },
    changeToStatic: (offsetSeq: number) => {
      update(state => ({
        ...state,
        mode: 'static',
        offsetSeq,
      }))

      ws.send(encode({ mode: 'static', offsetSeq }))
    },
    changeFormatter: (newFormatter: string) => {
      update(state => {
        // re-fetch data from the server so it can be formatted with the new formatter
        ws.send(encode({ mode: state.mode }))

        // save the new formatter
        return {
          ...state,
          window: [],
          formatter: newFormatter,
        }
      })
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
    return fn(msg.data, msg.seq)
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
