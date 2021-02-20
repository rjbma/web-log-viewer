"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var App_svelte_1 = __importDefault(require("./App.svelte"));
var app = new App_svelte_1.default({
    target: document.body,
    props: {
        name: "world",
    },
});
var ws = new WebSocket("ws://localhost:3000/");
ws.onopen = function () {
    console.log("WebSocket Client Connected");
    ws.send("Hi this is web client.");
};
ws.onmessage = function (e) {
    console.log("Received: '" + e.data + "'");
};
exports.default = app;
