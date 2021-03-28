import { map, runEffects, tap } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import express from 'express'
import http from 'http'
import { pipe } from 'ramda'
import WebSocket from 'ws'
import { createReadlineStream } from './stream-utils'
import { ClientMessage, LogMessage, ServerMessage } from './types'
import { config } from './config'
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
server.listen(config.port, () => {
  const address = server.address()
  if (address) {
    console.log(
      `Started on ${
        typeof address == 'string' ? address : `${address.port}`
      }. Waiting for log messages on stdin...`,
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
    tap(rawMessage => {
      if (config.stdout) {
        console.log(rawMessage)
      }
    }),
    map(rawMessage => {
      const data = config.parseRawMessage(rawMessage)
      const msg: LogMessage = {
        seq: logs.length + 1,
        data,
        index: config.extractIndexTokens(data),
      }
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
      ws.send(encode(buildStaticMessage(msg.filter, msg.offsetSeq)))
    }
  })

  function buildTailMessage(filter: string): ServerMessage {
    const matcher = isIndexMatch(filter)
    const filteredLogs = logs.filter(l => matcher(l.index)).map((l, i) => ({ ...l, seq: i + 1 }))
    return {
      type: 'init',
      mode: 'tail',
      size: filteredLogs.length,
      offsetSeq: -1,
      window: filteredLogs.slice(-LOG_WINDOW_SIZE),
    }
  }

  function buildStaticMessage(filter: string, offsetSeq: number): ServerMessage {
    const matcher = isIndexMatch(filter)
    const filteredLogs = logs.filter(l => matcher(l.index)).map((l, i) => ({ ...l, seq: i + 1 }))
    return {
      type: 'init',
      mode: 'static',
      size: filteredLogs.length,
      offsetSeq,
      window: filteredLogs.slice(
        Math.max(offsetSeq - LOG_WINDOW_SIZE / 2, 0),
        offsetSeq + LOG_WINDOW_SIZE / 2,
      ),
    }
  }
}

const encode = (data: ServerMessage) => JSON.stringify(data)
const decode = (data: WebSocket.Data): ClientMessage => JSON.parse(data.toString('utf-8'))
