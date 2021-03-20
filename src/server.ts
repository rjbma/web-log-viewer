import { map, runEffects, tap } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import express from 'express'
import http from 'http'
import { pipe } from 'ramda'
import WebSocket from 'ws'
import { createReadlineStream } from './stream-utils'
import { LogMessage, ServerMessage } from './types'
import { parseRawMessage } from './config'

const LOG_WINDOW_SIZE = 100

type ClientStatus =
  | { mode: 'tail' }
  | {
      mode: 'static'
      // the `seq` of the first message the client is locked on
      start: number
    }
const clients: ClientStatus[] = []

type RawMessage = string

// signal when a client wants to switch modes
type ClientMessage = StaticClientMessage | TailClientMessage
type StaticClientMessage = { mode: 'static'; offsetSeq: number }
type TailClientMessage = { mode: 'tail' }

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
      const msg: LogMessage = {
        seq: logs.length + 1,
        data: parseRawMessage(rawMessage),
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
  ws.send(encode(buildInitMessage()))

  ws.on('message', encodedMsg => {
    const msg = decode(encodedMsg) as ClientMessage
    if (msg.mode == 'tail') {
      ws.send(encode(buildInitMessage()))
    } else if (msg.mode == 'static') {
      ws.send(
        encode({
          type: 'init',
          mode: 'static',
          size: logs.length,
          window: logs.slice(
            Math.max(msg.offsetSeq - LOG_WINDOW_SIZE / 2, 0),
            msg.offsetSeq + LOG_WINDOW_SIZE / 2,
          ),
        }),
      )
    }
  })

  function buildInitMessage(): ServerMessage {
    return {
      type: 'init',
      mode: 'tail',
      size: logs.length,
      window: logs.slice(-LOG_WINDOW_SIZE),
    }
  }
}

const encode = (data: ServerMessage) => JSON.stringify(data)
const decode = (data: WebSocket.Data): ClientMessage => JSON.parse(data.toString('utf-8'))
