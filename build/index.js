"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
// import * as most from "@most/core";
// import * as sched from "@most/scheduler";
var core_1 = require("@most/core");
var stream_utils_1 = require("./stream-utils");
var ramda_1 = require("ramda");
var scheduler_1 = require("@most/scheduler");
var config = {
    lineType: "json",
    columns: {
        timestamp: function (l) { return l.timestamp; },
        message: function (l) { return l.message; },
    },
};
var transformLogLine = function (config) { return function (line) {
    var parsedLine = line;
    if (config.lineType === "json") {
        parsedLine = stream_utils_1.memoizedFromJson(line);
    }
    var result = Object.keys(config.columns).reduce(function (acc, col) {
        var _a;
        return (__assign(__assign({}, acc), (_a = {}, _a[col] = config.columns[col](parsedLine), _a)));
    }, {});
    return result;
}; };
var stream = ramda_1.pipe(function () { return stream_utils_1.createReadlineStream(); }, core_1.map(transformLogLine(config)), core_1.tap(function (l) { return console.log(l.timestamp, "  -->  ", l.message); }));
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
core_1.runEffects(stream(), scheduler_1.newDefaultScheduler());
