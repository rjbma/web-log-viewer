"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReadlineStream = exports.memoizedFromJson = void 0;
var adapter_1 = require("@most/adapter");
var readline = __importStar(require("readline"));
var json5_1 = __importDefault(require("json5"));
var memoizedFromJson = function (s) {
    try {
        return json5_1.default.parse(s);
    }
    catch (err) {
        return {};
    }
};
exports.memoizedFromJson = memoizedFromJson;
var createReadlineStream = function () {
    var _a = adapter_1.createAdapter(), induce = _a[0], readlineStream = _a[1];
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
    });
    rl.on("line", function (line) {
        induce(line);
    });
    return readlineStream;
};
exports.createReadlineStream = createReadlineStream;
