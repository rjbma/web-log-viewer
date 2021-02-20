"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qs = void 0;
var core_1 = require("@most/core");
var scheduler_1 = require("@most/scheduler");
var fail = function (s) {
    throw new Error(s);
};
var qs = function (s, el) {
    return el.querySelector(s) || fail(s + " not found");
};
exports.qs = qs;
// const incButton = qs("[name=inc]", document);
// const decButton = qs("[name=dec]", document);
// const value = qs(".value", document);
var inc = core_1.constant(1, core_1.periodic(1000));
// const dec = constant(-1, periodic(1000));
// const counter = scan(
//   (total, delta: number) => total + delta,
//   0,
//   merge(inc, dec)
// );
var render = core_1.tap(function (total) {
    console.log(new Date());
    // value.innerText = String(total);
}, inc);
core_1.runEffects(render, scheduler_1.newDefaultScheduler());
