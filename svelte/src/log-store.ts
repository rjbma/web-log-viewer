import { writable } from "svelte/store";

interface LogStore {
  mode: "tail" | "static";
  count: number;
  window: LogMessage[];
  latest: LogMessage[];
}

type LogMessage = Record<string, any> & { __seq: number };
// the message sent to clients that just connected. Contains the last logs, since new clients always start in 'tail' mode
type InitMessage = { type: "init"; size: number; window: LogMessage[] };
// the message sent to all clients once a new message comes in from stdin
type UpdateMessage = { type: "update"; size: number; message: LogMessage };
// all messages in the direction Server -> Client
type ServerMessage = InitMessage | UpdateMessage;

const LOG_WINDOW_SIZE = 100;
const LATEST_LOG_WINDOW_SIZE = 2;

function createLogStore() {
  const initialValue: LogStore = {
    mode: "tail",
    count: 0,
    window: [],
    latest: [],
  };
  const { subscribe, update } = writable(initialValue);

  const ws = new WebSocket("ws://localhost:3000/");
  ws.onopen = function () {
    console.log("WebSocket Client Connected");
  };
  ws.onmessage = function (e) {
    const msg = decode(e.data) as ServerMessage;
    console.log(msg);
    update((currentValue) => {
      if (msg.type === "init") {
        return {
          mode: "tail",
          count: msg.size,
          window: msg.window,
          latest: [],
        };
      } else if (msg.type === "update") {
        if (currentValue.mode === "tail") {
          return {
            ...currentValue,
            count: msg.size,
            window: [
              ...currentValue.window.slice(-LOG_WINDOW_SIZE),
              msg.message,
            ],
          };
        } else if (currentValue.mode === "static") {
          return {
            ...currentValue,
            count: msg.size,
            latest: [
              ...currentValue.latest.slice(-LATEST_LOG_WINDOW_SIZE),
              msg.message,
            ],
          };
        }
      }
    });
  };

  return { subscribe };
}

const decode = (data: string) => JSON.parse(data);

const logStore = createLogStore();
export { logStore };
export type { LogMessage };
