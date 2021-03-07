import { writable } from "svelte/store";
import type {
  FormattedMessage,
  LogFormatter,
  LogMessage,
  ServerMessage,
} from "./types";
import logFormatter from "./formatter";

interface TailLogStore {
  mode: "tail";
  count: number;
  columns: string[];
  window: FormattedMessage[];
  latest: FormattedMessage[];
}
interface StaticLogStore {
  mode: "static";
  offsetSeq: number;
  count: number;
  columns: string[];
  window: FormattedMessage[];
  latest: FormattedMessage[];
}
type LogStore = TailLogStore | StaticLogStore;

const LOG_WINDOW_SIZE = 100;
const LATEST_LOG_WINDOW_SIZE = 2;

function createLogStore(formatter: LogFormatter) {
  const columns = Object.keys(formatter);
  const initialValue: LogStore = {
    mode: "tail",
    count: 0,
    columns,
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
    const logFormatter = formatLogMessage(formatter);
    update((currentValue) => {
      if (msg.type === "init") {
        if (msg.mode === "tail") {
          return {
            mode: msg.mode,
            count: msg.size,
            columns,
            window: msg.window.map(logFormatter),
            latest: [],
          };
        } else if (msg.mode === "static") {
          return {
            mode: msg.mode,
            count: msg.size,
            columns,
            window: msg.window.map(logFormatter),
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
              logFormatter(msg.message),
            ],
          };
        } else if (currentValue.mode === "static") {
          return {
            ...currentValue,
            count: msg.size,
            latest: [
              ...currentValue.latest.slice(-LATEST_LOG_WINDOW_SIZE),
              logFormatter(msg.message),
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
const formatLogMessage = (formatter: LogFormatter) => (
  msg: LogMessage
): FormattedMessage =>
  Object.keys(formatter).reduce(
    (acc, key) => ({
      ...acc,
      [key]: execFn(formatter[key], msg),
    }),
    { __seq: () => msg.__seq }
  );
const execFn = (fn: (msg: LogMessage) => any, msg: LogMessage) => {
  try {
    return fn(msg);
  } catch (err) {
    return "";
  }
};

const logStore = createLogStore(logFormatter);
export { logStore };
