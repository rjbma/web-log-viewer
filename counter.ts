import { constant, scan, merge, tap, runEffects, periodic } from "@most/core";
import { newDefaultScheduler } from "@most/scheduler";
import { click } from "@most/dom-event";

const fail = (s: string) => {
  throw new Error(s);
};
export const qs = (s: string, el: any) =>
  el.querySelector(s) || fail(`${s} not found`);

// const incButton = qs("[name=inc]", document);
// const decButton = qs("[name=dec]", document);
// const value = qs(".value", document);

const inc = constant(1, periodic(1000));
// const dec = constant(-1, periodic(1000));

// const counter = scan(
//   (total, delta: number) => total + delta,
//   0,
//   merge(inc, dec)
// );

const render = tap((total) => {
  console.log(new Date());
  // value.innerText = String(total);
}, inc);

runEffects(render, newDefaultScheduler())
