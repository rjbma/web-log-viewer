const ws = new WebSocket("ws://localhost:3000/");
ws.onopen = function () {
  console.log("WebSocket Client Connected");
  ws.send("Hi this is web client.");
};
ws.onmessage = function (e) {
  console.log("Received: '" + e.data + "'");
};

const numRows = 100000000;
const lineHeight = 30;

// setTimeout(() => {
//   const start = new Date().getTime();
//   const table = document.getElementById("logs-table") as HTMLTableElement;
//   for (let i = 0; i < numRows; i++) {
//     const row = table.insertRow();
//     const cell = row.insertCell();
//     cell.appendChild(document.createTextNode(i.toString()));
//   }
//   console.log("took: ", new Date().getTime() - start, "ms");
// }, 3000);

const start = new Date().getTime();
const table = document.getElementById("logs-table");
table?.setAttribute("style", `height:${numRows * lineHeight}px`);
console.log("took: ", new Date().getTime() - start, "ms");
