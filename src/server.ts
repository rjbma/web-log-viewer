import { map, runEffects, tap } from "@most/core";
import * as most from "@most/core";
import { newDefaultScheduler } from "@most/scheduler";
import express from "express";
import http from "http";
import { pipe } from "ramda";
import WebSocket from "ws";
import { createReadlineStream } from "./stream-utils";

const LOG_WINDOW_SIZE = 2;

type ClientStatus =
  | { mode: "tail" }
  | {
      mode: "static";
      start: number;
    };
const clients: ClientStatus[] = [];

type RawMessage = string;
type LogMessage = any;

// the message sent to clients that just connected. Contains the last logs, since new clients always start in 'tail' mode
type InitMessage = { type: "init"; size: number; window: LogMessage[] };
// the message sent to all clients once a new message comes in from stdin
type UpdateMessage = { type: "update"; size: number; message: LogMessage };
// all messages in the direction Server -> Client
type ServerMessage = InitMessage | UpdateMessage;

const app = express();
// app.use(express.static("public"));

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws: WebSocket) => {
  const clientId = clients.length;
  clients.push({ mode: "tail" });

  // send a window with the last logs to newly registered clients
  const initMsg: InitMessage = {
    type: "init",
    size: logs.length,
    window: logs.slice(-LOG_WINDOW_SIZE),
  };
  ws.send(encode(initMsg));

  // send new messages to clients in 'tail' mode
  // const wsStream = tap((rawLog: RawMessage) => {
  //   const updateMsg: UpdateMessage = {
  //     type: "update",
  //     size: logs.length,
  //     message: rawLog,
  //   };
  //   ws.send(encode(updateMsg));
  // }, logStream);
  // runEffects(wsStream, newDefaultScheduler());

  // // const logStream = setupLogStream(ws);
  // const wsLogStream = most.tap((l) => {
  //   console.log("sending", l);
  //   ws.send(l);
  // })(logStream);
  // runEffects(wsLogStream, newDefaultScheduler());

  // //connection is up, let's add a simple simple event
  // ws.on("message", (message: string) => {
  //   //log the received message and send it back to the client
  //   console.log("received: %s", message);
  //   ws.send(`Hello, you sent -> ${message}`);
  // });

  //send immediatly a feedback to the incoming connection
  ws.send(`I have ${logs.length} lines`);
});

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

    // const logStream = setupLogStream(wss);
  }
});

const setupLogStream = () =>
  pipe(
    () => createReadlineStream(),
    // map(transformLogLine(config)),
    tap((l) => console.log("received from stdin", l)),
    tap((l) => {
      console.log("pushed 1, got ", logs.length + 1);
      logs.push(l);
    }),
    tap((rawLog: RawMessage) => {
      const updateMsg: UpdateMessage = {
        type: "update",
        size: logs.length,
        message: rawLog,
      };
      wss.clients.forEach((ws) => {
        ws.send(encode(updateMsg));
      });
    })

    // tap((l) => ws.send("dfdfdf"))
    // tap((l) => {
    //   console.log(1);
    //   //   wss.clients.forEach((ws) => ws.send("iei"));
    // })
  );

const logs: RawMessage[] = [];

const logStream = setupLogStream()();
runEffects(logStream, newDefaultScheduler());

// const setupLogStream = (ws: WebSocket) =>
//   pipe(
//     () => createReadlineStream(),
//     // map(transformLogLine(config)),
//     tap((l) => {
//       console.log(2);
//       ws.send(l);
//     })
//   );

const encode = (data: ServerMessage) => JSON.stringify(data);
const decode = (data: string) => JSON.parse(data);
