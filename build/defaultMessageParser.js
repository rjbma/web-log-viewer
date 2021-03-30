"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var json5_1 = __importDefault(require("json5"));
/**
 * Default parser implementation, that transforms a string (usually a single
 * line of text coming in from **stdin**) into a JSON object containing the data
 * present in a log message
 */
module.exports = function (rawMessage) {
    try {
        return json5_1.default.parse(rawMessage);
    }
    catch (err) {
        var msg = { message: rawMessage };
        return msg;
    }
};
