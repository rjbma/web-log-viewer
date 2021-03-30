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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@most/core");
var scheduler_1 = require("@most/scheduler");
var express_1 = __importDefault(require("express"));
var http_1 = __importDefault(require("http"));
var ramda_1 = require("ramda");
var ws_1 = __importDefault(require("ws"));
var stream_utils_1 = require("./stream-utils");
var config_1 = require("./config");
var log_index_1 = require("./log-index");
var path_1 = __importDefault(require("path"));
var LOG_WINDOW_SIZE = 100;
var clients = [];
/**Contains all the logs that came into the server up until now */
var logs = [];
// setup the server
var app = express_1.default();
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
var server = http_1.default.createServer(app);
var wss = new ws_1.default.Server({ server: server });
//start our server
server.listen(config_1.config.port, function () {
    var address = server.address();
    if (address) {
        console.log("Started on " + (typeof address == 'string' ? address : "" + address.port) + ". Waiting for log messages on stdin...");
        // setup the log stream from stdin to clients
        var logStream = setupLogStream()();
        core_1.runEffects(logStream, scheduler_1.newDefaultScheduler());
        // waits for WS clients to connect
        wss.on('connection', setupNewClient);
    }
});
/**
 * Sets up the stream that receives messages from **stdin** and
 * pipes them to all registered clients using websockets.
 */
var setupLogStream = function () {
    return ramda_1.pipe(function () { return stream_utils_1.createReadlineStream(); }, core_1.tap(function (rawMessage) {
        if (config_1.config.stdout) {
            console.log(rawMessage);
        }
    }), core_1.map(function (rawMessage) {
        var data = config_1.config.parseRawMessage(rawMessage);
        var msg = {
            seq: logs.length + 1,
            data: data,
            index: config_1.config.extractIndexTokens(data),
        };
        logs.push(msg);
        return msg;
    }), core_1.tap(function (rawLog) {
        var updateMsg = {
            type: 'update',
            size: logs.length,
            message: rawLog,
        };
        wss.clients.forEach(function (ws) {
            ws.send(encode(updateMsg));
        });
    }));
};
/**
 * Function executed every time a new WS client connects to the server.
 * This will send a `InitMessage` to that client, so it can immediately start showing to the user.
 */
function setupNewClient(ws) {
    var clientId = clients.length;
    clients.push({ mode: 'tail' });
    // send a window with the last logs to newly registered clients
    ws.send(encode(buildTailMessage('')));
    ws.on('message', function (encodedMsg) {
        var msg = decode(encodedMsg);
        if (msg.mode == 'tail') {
            ws.send(encode(buildTailMessage(msg.filter)));
        }
        else if (msg.mode == 'static') {
            ws.send(encode(buildStaticMessage(msg.filter, msg.offsetSeq)));
        }
    });
    function buildTailMessage(filter) {
        var matcher = log_index_1.isIndexMatch(filter);
        var filteredLogs = logs.filter(function (l) { return matcher(l.index); }).map(function (l, i) { return (__assign(__assign({}, l), { seq: i + 1 })); });
        return {
            type: 'init',
            mode: 'tail',
            size: filteredLogs.length,
            offsetSeq: -1,
            window: filteredLogs.slice(-LOG_WINDOW_SIZE),
        };
    }
    function buildStaticMessage(filter, offsetSeq) {
        var matcher = log_index_1.isIndexMatch(filter);
        var filteredLogs = logs.filter(function (l) { return matcher(l.index); }).map(function (l, i) { return (__assign(__assign({}, l), { seq: i + 1 })); });
        return {
            type: 'init',
            mode: 'static',
            size: filteredLogs.length,
            offsetSeq: offsetSeq,
            window: filteredLogs.slice(Math.max(offsetSeq - LOG_WINDOW_SIZE / 2, 0), offsetSeq + LOG_WINDOW_SIZE / 2),
        };
    }
}
var encode = function (data) { return JSON.stringify(data); };
var decode = function (data) { return JSON.parse(data.toString('utf-8')); };
