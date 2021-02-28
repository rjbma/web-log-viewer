import { map, runEffects, tap } from "@most/core";
import * as most from "@most/core";
import { newDefaultScheduler } from "@most/scheduler";
import express from "express";
import http from "http";
import { pipe } from "ramda";
import WebSocket from "ws";
import { createReadlineStream } from "./stream-utils";
import json5 from "json5";

const LOG_WINDOW_SIZE = 100;

type ClientStatus =
  | { mode: "tail" }
  | {
      mode: "static";
      start: number;
    };
const clients: ClientStatus[] = [];

type RawMessage = string;
type LogMessage = Record<string, any> & { __seq: number };
// the message sent to clients that just connected. Contains the last logs, since new clients always start in 'tail' mode
type InitMessage = { type: "init"; size: number; window: LogMessage[] };
// the message sent to all clients once a new message comes in from stdin
type UpdateMessage = { type: "update"; size: number; message: LogMessage };
// all messages in the direction Server -> Client
type ServerMessage = InitMessage | UpdateMessage;

/**Contains all the logs that came into the server up untill now */
const logs: LogMessage[] = [];

// setup the server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

//start our server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  const address = server.address();
  if (address) {
    console.log(
      `Server started on port ${
        typeof address == "string" ? address : `${address.port}`
      })`
    );

    // setup the log stream from stdin to clients
    const logStream = setupLogStream()();
    runEffects(logStream, newDefaultScheduler());

    // waits for WS clients to connect
    wss.on("connection", setupNewClient);
  }
});

/**
 * Sets up the stream that receives messages from **stdin** and
 * pipes them to all registered clients using websockets.
 */
const setupLogStream = () =>
  pipe(
    () => createReadlineStream(),
    // map(transformLogLine(config)),
    // tap((l) => console.log("received from stdin", l)),
    map(parseRawMessage),
    map((msg) => {
      msg.__seq = logs.length + 1;
      logs.push(msg);
      return msg;
    }),
    tap((rawLog: LogMessage) => {
      const updateMsg: UpdateMessage = {
        type: "update",
        size: logs.length,
        message: rawLog,
      };
      wss.clients.forEach((ws) => {
        ws.send(encode(updateMsg));
      });
    })
  );

const parseRawMessage = (rl: RawMessage) => {
  try {
    const msg = json5.parse(rl);
    return msg;
  } catch (err) {
    const msg = { message: rl };
    return msg;
  }
};

/**
 * Function executed every time a new WS client connects to the server.
 * This will send a `InitMessage` to that client, so it can immediately start showing to the user.
 */
function setupNewClient(ws: WebSocket) {
  const clientId = clients.length;
  clients.push({ mode: "tail" });

  // send a window with the last logs to newly registered clients
  const initMsg: InitMessage = {
    type: "init",
    size: logs.length,
    window: logs.slice(-LOG_WINDOW_SIZE),
  };
  ws.send(encode(initMsg));
}

const encode = (data: ServerMessage) => JSON.stringify(data);
