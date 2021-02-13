import { createAdapter } from "@most/adapter";
import * as readline from "readline";
import json5 from "json5";

const memoizedFromJson = (s: string) => {
  try {
    return json5.parse(s);
  } catch (err) {
    return {};
  }
};

const createReadlineStream = () => {
  const [induce, readlineStream] = createAdapter<string>();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });
  rl.on("line", (line) => {
    induce(line);
  });

  return readlineStream;
};

export { memoizedFromJson, createReadlineStream };
