"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
var commander_1 = require("commander");
var log_index_1 = require("./log-index");
var program = new commander_1.Command('web-log-viewer');
program.version('0.0.1');
program.option('--port <port>', 'specify the port where the server will run', '8000');
program.option('-p, --parser <filename>', 'specify the script used for parsing lines of text from stdin and converting them to JSON. Defaults to parse using `json5` (https://www.npmjs.com/package/json5)');
program.option('-k, --index-keys', 'allow searching by the log object keys, instead of just its values', false);
program.option('-s, --stdout', 'log every message coming in to stdout', false);
program.parse(process.argv);
var options = program.opts();
var config = {
    port: options.port || 8000,
    stdout: options.stdout || false,
    parseRawMessage: options.parser ? require(options.parser) : require('./defaultMessageParser'),
    extractIndexTokens: log_index_1.extractIndexTokens({ includeObjectKeys: options.indexKeys }),
};
exports.config = config;
