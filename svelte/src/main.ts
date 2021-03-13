import App from './App.svelte'

const app = new App({
  target: document.body,
  props: {},
})

// type LogMessage = Record<string, any> & { __seq: number };
// // the message sent to clients that just connected. Contains the last logs, since new clients always start in 'tail' mode
// type InitMessage = { type: "init"; size: number; window: LogMessage[] };
// // the message sent to all clients once a new message comes in from stdin
// type UpdateMessage = { type: "update"; size: number; message: LogMessage };
// // all messages in the direction Server -> Client
// type ServerMessage = InitMessage | UpdateMessage;

// const LOG_WINDOW_SIZE = 5;
// const LATEST_LOG_WINDOW_SIZE = 2;
// let mode: "tail" | "static" = "tail";
// let messages: LogMessage[] = [];
// let latestMessages: LogMessage[] = [];

// const ws = new WebSocket("ws://localhost:3000/");
// ws.onopen = function () {
//   console.log("WebSocket Client Connected");
// };
// ws.onmessage = function (e) {
//   const msg = decode(e.data) as LogMessage;
//   if (msg.type === "init") {
//     messages = [...msg.window];
//   } else if (msg.type === "update") {
//     if (mode === "tail") {
//       messages = [...messages.slice(-LOG_WINDOW_SIZE), msg.message];
//     } else if (mode === "static") {
//       latestMessages = [
//         ...latestMessages.slice(-LATEST_LOG_WINDOW_SIZE),
//         msg.message,
//       ];
//     }
//   }
// };

// const decode = (data: string) => JSON.parse(data);

export default app
