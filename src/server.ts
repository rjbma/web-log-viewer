import { map, runEffects, tap } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import express from 'express'
import http from 'http'
import { pipe } from 'ramda'
import WebSocket from 'ws'
import { createReadlineStream } from './stream-utils'
import { ClientMessage, LogMessage, ServerMessage } from './types'
import { extractIndexTokens, parseRawMessage } from './config'
import { isIndexMatch } from './log-index'

const LOG_WINDOW_SIZE = 100

type ClientStatus =
  | { mode: 'tail' }
  | {
      mode: 'static'
      // the `seq` of the first message the client is locked on
      start: number
    }
const clients: ClientStatus[] = []

/**Contains all the logs that came into the server up until now */
const logs: LogMessage[] = []

// setup the server
const app = express()
app.use(express.static('public'))
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

//start our server
const port = process.env.PORT || 3000
server.listen(port, () => {
  const address = server.address()
  if (address) {
    console.log(
      `Server started on port ${typeof address == 'string' ? address : `${address.port}`})`,
    )

    // setup the log stream from stdin to clients
    const logStream = setupLogStream()()
    runEffects(logStream, newDefaultScheduler())

    // waits for WS clients to connect
    wss.on('connection', setupNewClient)
  }
})

/**
 * Sets up the stream that receives messages from **stdin** and
 * pipes them to all registered clients using websockets.
 */
const setupLogStream = () =>
  pipe(
    () => createReadlineStream(),
    map(rawMessage => {
      const data = parseRawMessage(rawMessage)
      const msg: LogMessage = {
        seq: logs.length + 1,
        data,
        index: extractIndexTokens(data),
      }
      console.log(msg)
      logs.push(msg)
      return msg
    }),
    tap((rawLog: LogMessage) => {
      const updateMsg: ServerMessage = {
        type: 'update',
        size: logs.length,
        message: rawLog,
      }
      wss.clients.forEach(ws => {
        ws.send(encode(updateMsg))
      })
    }),
  )

/**
 * Function executed every time a new WS client connects to the server.
 * This will send a `InitMessage` to that client, so it can immediately start showing to the user.
 */
function setupNewClient(ws: WebSocket) {
  const clientId = clients.length
  clients.push({ mode: 'tail' })

  // send a window with the last logs to newly registered clients
  ws.send(encode(buildTailMessage('')))

  ws.on('message', encodedMsg => {
    const msg = decode(encodedMsg) as ClientMessage
    if (msg.mode == 'tail') {
      ws.send(encode(buildTailMessage(msg.filter)))
    } else if (msg.mode == 'static') {
      const matcher = isIndexMatch(msg.filter)
      const filteredLogs = logs.filter(l => matcher(l.index))
      ws.send(
        encode({
          type: 'init',
          mode: 'static',
          size: filteredLogs.length,
          offsetSeq: msg.offsetSeq,
          window: filteredLogs.slice(
            Math.max(msg.offsetSeq - LOG_WINDOW_SIZE / 2, 0),
            msg.offsetSeq + LOG_WINDOW_SIZE / 2,
          ),
        }),
      )
    }
  })

  function buildTailMessage(filter: string): ServerMessage {
    filter = '231ac91c-cef8-4c3d-9b26-0d1695dd9ef8 request'
    const matcher = isIndexMatch(filter)
    const filteredLogs = logs.filter(l => matcher(l.index))
    return {
      type: 'init',
      mode: 'tail',
      size: filteredLogs.length,
      offsetSeq: -1,
      window: filteredLogs.slice(-LOG_WINDOW_SIZE),
    }
  }
}

const encode = (data: ServerMessage) => JSON.stringify(data)
const decode = (data: WebSocket.Data): ClientMessage => JSON.parse(data.toString('utf-8'))
