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
var LOG_WINDOW_SIZE = 2;
var clients = [];
var app = express_1.default();
app.use(express_1.default.static("public"));
//initialize a simple http server
var server = http_1.default.createServer(app);
//initialize the WebSocket server instance
var wss = new ws_1.default.Server({ server: server });
wss.on("connection", function (ws) {
    var clientId = clients.length;
    clients.push({ mode: "tail" });
    // send a window with the last logs to newly registered clients
    var initMsg = {
        type: "init",
        size: logs.length,
        window: logs.slice(-LOG_WINDOW_SIZE),
    };
    ws.send(encode(initMsg));
    // send new messages to clients in 'tail' mode
    // const wsStream = tap((rawLog: RawMessage) => {
    //   const updateMsg: UpdateMessage = {
    //     type: "update",
    //     size: logs.length,
    //     message: rawLog,
    //   };
    //   ws.send(encode(updateMsg));
    // }, logStream);
    // runEffects(wsStream, newDefaultScheduler());
    // // const logStream = setupLogStream(ws);
    // const wsLogStream = most.tap((l) => {
    //   console.log("sending", l);
    //   ws.send(l);
    // })(logStream);
    // runEffects(wsLogStream, newDefaultScheduler());
    // //connection is up, let's add a simple simple event
    // ws.on("message", (message: string) => {
    //   //log the received message and send it back to the client
    //   console.log("received: %s", message);
    //   ws.send(`Hello, you sent -> ${message}`);
    // });
    //send immediatly a feedback to the incoming connection
    ws.send("I have " + logs.length + " lines");
});
//start our server
var port = process.env.PORT || 3000;
server.listen(port, function () {
    var address = server.address();
    if (address) {
        console.log("Server started on port " + (typeof address == "string" ? address : "" + address.port) + ")");
        // const logStream = setupLogStream(wss);
    }
});
var setupLogStream = function () {
    return ramda_1.pipe(function () { return stream_utils_1.createReadlineStream(); }, 
    // map(transformLogLine(config)),
    core_1.tap(function (l) { return console.log("received from stdin", l); }), core_1.tap(function (l) {
        console.log("pushed 1, got ", logs.length + 1);
        logs.push(l);
    }), core_1.tap(function (rawLog) {
        var updateMsg = {
            type: "update",
            size: logs.length,
            message: rawLog,
        };
        wss.clients.forEach(function (ws) {
            ws.send(encode(updateMsg));
        });
    })
    // tap((l) => ws.send("dfdfdf"))
    // tap((l) => {
    //   console.log(1);
    //   //   wss.clients.forEach((ws) => ws.send("iei"));
    // })
    );
};
var logs = [];
var logStream = setupLogStream()();
core_1.runEffects(logStream, scheduler_1.newDefaultScheduler());
// const setupLogStream = (ws: WebSocket) =>
//   pipe(
//     () => createReadlineStream(),
//     // map(transformLogLine(config)),
//     tap((l) => {
//       console.log(2);
//       ws.send(l);
//     })
//   );
var encode = function (data) { return JSON.stringify(data); };
var decode = function (data) { return JSON.parse(data); };
