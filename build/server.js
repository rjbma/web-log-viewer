"use strict";
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
var json5_1 = __importDefault(require("json5"));
var LOG_WINDOW_SIZE = 100;
var clients = [];
/**Contains all the logs that came into the server up untill now */
var logs = [];
// setup the server
var app = express_1.default();
var server = http_1.default.createServer(app);
var wss = new ws_1.default.Server({ server: server });
//start our server
var port = process.env.PORT || 3000;
server.listen(port, function () {
    var address = server.address();
    if (address) {
        console.log("Server started on port " + (typeof address == "string" ? address : "" + address.port) + ")");
        // setup the log stream from stdin to clients
        var logStream = setupLogStream()();
        core_1.runEffects(logStream, scheduler_1.newDefaultScheduler()).then(function () {
            console.log("ieiei");
        });
        // waits for WS clients to connect
        setTimeout(function () {
            wss.on("connection", setupNewClient);
        }, 10000);
    }
});
/**
 * Sets up the stream that receives messages from **stdin** and
 * pipes them to all registered clients using websockets.
 */
var setupLogStream = function () {
    return ramda_1.pipe(function () { return stream_utils_1.createReadlineStream(); }, 
    // map(transformLogLine(config)),
    // tap((l) => console.log("received from stdin", l)),
    core_1.map(parseRawMessage), core_1.map(function (msg) {
        msg.__seq = logs.length + 1;
        logs.push(msg);
        return msg;
    }), core_1.tap(function (rawLog) {
        var updateMsg = {
            type: "update",
            size: logs.length,
            message: rawLog,
        };
        wss.clients.forEach(function (ws) {
            ws.send(encode(updateMsg));
        });
    }));
};
var parseRawMessage = function (rl) {
    try {
        var msg = json5_1.default.parse(rl);
        return msg;
    }
    catch (err) {
        var msg = { message: rl };
        return msg;
    }
};
/**
 * Function executed every time a new WS client connects to the server.
 * This will send a `InitMessage` to that client, so it can immediately start showing to the user.
 */
function setupNewClient(ws) {
    var clientId = clients.length;
    clients.push({ mode: "tail" });
    // send a window with the last logs to newly registered clients
    var initMsg = {
        type: "init",
        size: logs.length,
        window: logs.slice(-LOG_WINDOW_SIZE),
    };
    ws.send(encode(initMsg));
}
var encode = function (data) { return JSON.stringify(data); };
