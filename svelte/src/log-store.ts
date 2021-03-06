import { writable } from "svelte/store";
import type { LogMessage, ServerMessage } from "./types";

interface TailLogStore {
  mode: "tail";
  count: number;
  window: LogMessage[];
  latest: LogMessage[];
}
interface StaticLogStore {
  mode: "static";
  offsetSeq: number;
  count: number;
  window: LogMessage[];
  latest: LogMessage[];
}
type LogStore = TailLogStore | StaticLogStore;

const LOG_WINDOW_SIZE = 100;
const LATEST_LOG_WINDOW_SIZE = 2;

function createLogStore() {
  const initialValue: LogStore = {
    mode: "tail",
    count: 0,
    window: [],
    latest: [],
  };
  const { subscribe, update } = writable<LogStore>(initialValue);

  const ws = new WebSocket("ws://localhost:3000/");
  ws.onopen = function () {
    console.log("WebSocket Client Connected");
  };
  ws.onmessage = function (e) {
    const msg = decode(e.data) as ServerMessage;
    update((currentValue) => {
      if (msg.type === "init") {
        if (msg.mode === "tail") {
          return {
            mode: msg.mode,
            count: msg.size,
            window: msg.window,
            latest: [],
          };
        } else if (msg.mode === "static") {
          return {
            mode: msg.mode,
            count: msg.size,
            window: msg.window,
            offsetSeq: msg.window.length ? msg.window[0].__seq : 0,
            latest: [],
          };
        }
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

  return {
    subscribe,
    changeToTail: () => {
      update((state) => ({
        ...state,
        mode: "tail",
        offsetSeq: undefined,
      }));

      ws.send(encode({ mode: "tail" }));
    },
    changeToStatic: (offsetSeq: number) => {
      update((state) => ({
        ...state,
        mode: "static",
        offsetSeq,
      }));

      ws.send(encode({ mode: "static", offsetSeq }));
    },
  };
}

const encode = (data: any) => JSON.stringify(data);
const decode = (data: string) => JSON.parse(data);

const logStore = createLogStore();
export { logStore };
export type { LogMessage };
