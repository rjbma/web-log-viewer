import App from "./App.svelte";

const app = new App({
  target: document.body,
  props: {
    name: "world",
  },
});

const ws = new WebSocket("ws://localhost:3000/");
ws.onopen = function () {
  console.log("WebSocket Client Connected");
  ws.send("Hi this is web client.");
};
ws.onmessage = function (e) {
  console.log("Received: '" + e.data + "'");
};

export default app;
