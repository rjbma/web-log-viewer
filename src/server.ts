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
import path from 'path'

const LOG_WINDOW_SIZE = 100

/**
 * Status of each WS client that's currently connected
 */
type ClientStatus =
  | {
      mode: 'tail'
      /**current filter query defined in the client */
      filter: string
      /**number of messages that the client knows about, AFTER filtering */
      count: number
    }
  | {
      mode: 'static'
      /**the `seq` of the first message the client is locked on */
      start: number
      /**current filter query defined in the client */
      filter: string
      /**number of messages that the client knows about, AFTER filtering */
      count: number
    }

/**Contains all the logs that came into the server up until now */
const logs: LogMessage[] = []

// setup the server
const app = express()
app.use(express.static(path.join(__dirname, 'public')))
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
    // optionally log the message to the server's console
    tap(rawMessage => {
      if (config.stdout) {
        console.log(rawMessage)
      }
    }),
    // parse the message with the currently configured parser
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
    // potentially, send the message to all currently connected clients
    tap((rawLog: LogMessage) => {
      const updateMsg: ServerMessage = {
        type: 'update',
        size: logs.length,
        message: rawLog,
      }
      wss.clients.forEach(ws => {
        const status = getWsClientStatus(ws)
        const matcher = isIndexMatch(status.filter)
        // only send the new message to the client if it passes the client's filter
        if (matcher(updateMsg.message.index)) {
          ws.send(encode(updateMsg))
        }
      })
    }),
  )

function updateWsClientStatus(ws: WebSocket, newStatus: ClientStatus) {
  ;(ws as any)._status = newStatus
}

function getWsClientStatus(ws: WebSocket): ClientStatus {
  return (ws as any)._status
}

/**
 * Function executed every time a new WS client connects to the server.
 * This will send a `InitMessage` to that client, so it can immediately start showing to the user.
 */
function setupNewClient(ws: WebSocket) {
  updateWsClientStatus(ws, { mode: 'tail', filter: '' })

  // send a window with the last logs to newly registered clients
  ws.send(encode(buildTailMessage('')))

  ws.on('message', encodedMsg => {
    const msg = decode(encodedMsg) as ClientMessage
    if (msg.mode == 'tail') {
      updateWsClientStatus(ws, { mode: 'tail', filter: msg.filter })
      ws.send(encode(buildTailMessage(msg.filter)))
    } else if (msg.mode == 'static') {
      updateWsClientStatus(ws, { mode: 'static', start: msg.offsetSeq, filter: msg.filter })
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
