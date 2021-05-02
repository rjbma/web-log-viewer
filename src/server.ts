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
      /**the index of the first message the client is locked on */
      offsetStart: number
      /**Maximum number of messages that should be sent to the client */
      maxMessages: number
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
      wss.clients.forEach(ws => {
        updateWsClientStatus(ws, status => {
          const updateMsg: ServerMessage = {
            type: 'update',
            size: status.count + 1,
            message: rawLog,
          }
          // only send the new message to the client if it passes the client's filter
          const matcher = isIndexMatch(status.filter)
          if (matcher(updateMsg.message.index)) {
            ws.send(encode({ ...updateMsg, message: { ...updateMsg.message } }))
            return { ...status, count: updateMsg.size }
          } else {
            return status
          }
        })
      })
    }),
  )

/**
 * Update the status associated with a particular WS client
 * @param ws the WS client instance
 * @param statusFn a function that receives the current status and returns the new one
 */
function updateWsClientStatus(
  ws: WebSocket,
  statusFn: (currentStatus: ClientStatus) => ClientStatus,
) {
  const currentStatus = getWsClientStatus(ws)
  ;(ws as any)._status = statusFn(currentStatus)
}

/**
 * Get the status associated with a particular wS client
 */
function getWsClientStatus(ws: WebSocket): ClientStatus {
  return (ws as any)._status
}

/**
 * Function executed every time a new WS client connects to the server.
 * This will send a `InitMessage` to that client, so it can immediately start showing to the user.
 */
function setupNewClient(ws: WebSocket) {
  updateWsClientStatus(ws, () => ({ mode: 'tail', filter: '', count: 0 }))

  // when the client send a message, it means one of the following:
  // - change mode to tail/static
  // - specify a new filter query
  // - change the offset of static mode
  ws.on('message', encodedMsg => {
    const msg = decode(encodedMsg) as ClientMessage
    const matcher = isIndexMatch(msg.filter)
    const filteredLogs = logs.filter(l => matcher(l.index))
    if (msg.mode == 'tail') {
      updateWsClientStatus(ws, currentStatus => ({
        ...currentStatus,
        mode: 'tail',
        filter: msg.filter,
        count: filteredLogs.length,
      }))
      ws.send(encode(buildTailMessage(filteredLogs, msg.maxMessages)))
    } else if (msg.mode == 'static') {
      updateWsClientStatus(ws, currentStatus => ({
        ...currentStatus,
        mode: 'static',
        offsetStart: msg.offsetStart,
        maxMessages: msg.maxMessages,
        filter: msg.filter,
        count: filteredLogs.length,
      }))
      ws.send(encode(buildStaticMessage(filteredLogs, msg.offsetStart, msg.maxMessages)))
    }
  })

  function buildTailMessage(filteredLogs: LogMessage[], maxMessages: number): ServerMessage {
    return {
      type: 'init',
      mode: 'tail',
      totalSize: logs.length,
      window: {
        size: filteredLogs.length,
        maxMessages,
        messages: filteredLogs.slice(-maxMessages),
      },
    }
  }

  function buildStaticMessage(
    filteredLogs: LogMessage[],
    offsetStart: number,
    maxMessages: number,
  ): ServerMessage {
    const totalSize = logs.length
    const filteredSize = filteredLogs.length
    return {
      type: 'init',
      mode: 'static',
      totalSize,
      window: {
        size: filteredSize,
        offsetStart,
        maxMessages,
        messages: filteredLogs.slice(offsetStart, offsetStart + maxMessages),
      },
    }
  }
}

const encode = (data: ServerMessage) => JSON.stringify(data)
const decode = (data: WebSocket.Data): ClientMessage => JSON.parse(data.toString('utf-8'))
