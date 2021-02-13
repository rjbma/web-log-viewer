// import * as most from "@most/core";
// import * as sched from "@most/scheduler";
import { map, runEffects, tap } from "@most/core";
import { mouseenter } from "@most/dom-event";
import { createReadlineStream, memoizedFromJson } from "./stream-utils";
import { compose, pipe } from "ramda";
import { newDefaultScheduler } from "@most/scheduler";

type JsonLogLine = Record<string, any>;
type TextLogLine = string;
type ColumnViewerFn<LINE_TYPE> = (d: LINE_TYPE) => string | number | Date;

interface LogViewerConfig<T> {
  lineType: "json" | "text";
  columns: Record<string, ColumnViewerFn<T>>;
}
interface JsonLogViewerConfig extends LogViewerConfig<JsonLogLine> {
  lineType: "json";
}
interface TextLogViewerConfig extends LogViewerConfig<TextLogLine> {
  lineType: "text";
}

const config: JsonLogViewerConfig = {
  lineType: "json",
  columns: {
    timestamp: (l) => l.timestamp,
    message: (l) => l.message,
  },
};

const transformLogLine = <T>(config: LogViewerConfig<T>) => (line: string) => {
  let parsedLine: any = line;
  if (config.lineType === "json") {
    parsedLine = memoizedFromJson(line);
  }
  const result = Object.keys(config.columns).reduce(
    (acc, col) => ({ ...acc, [col]: config.columns[col](parsedLine) }),
    {} as JsonLogLine
  );
  return result;
};

const stream = pipe(
  () => createReadlineStream(),
  map(transformLogLine(config)),
  tap((l) => console.log(l.timestamp, "  -->  ", l.message))
);

// const pipeline = compose(
//   tap((l) => JSON.stringify(l)),
//   map(transformLogLine(config))
// );
// pipeline(createReadlineStream());
// const stream = map(transformLogLine(config), createReadlineStream());

// const tickStream = most.periodic(1);

// const s = most.map(() => new Date().getTime(), tickStream);
// const s = most.tap(() => console.log(new Date().getTime()), tickStream);

// const fn = compose(
//   () => new Date(),
//   (t) => console.log(t)
// );

// const s = most.tap(fn, tickStream);

runEffects(stream(), newDefaultScheduler());
