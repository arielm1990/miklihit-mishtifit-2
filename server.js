const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws" });

// Serve index.html from the main folder
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const players = {};

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on("connection", ws => {
  let currentId = null;

  ws.on("message", raw => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === "update" && msg.id && msg.player) {
        currentId = msg.id;
        players[msg.id] = {
          ...msg.player,
          lastSeen: Date.now()
        };

        broadcast({
          type: "players",
          players
        });
      }
    } catch (e) {}
  });

  ws.on("close", () => {
    if (currentId) {
      delete players[currentId];
      broadcast({
        type: "leave",
        id: currentId
      });
    }
  });
});

setInterval(() => {
  const cutoff = Date.now() - 10000;

  for (const id of Object.keys(players)) {
    if (players[id].lastSeen < cutoff) {
      delete players[id];
    }
  }

  broadcast({
    type: "players",
    players
  });
}, 3000);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Game running on port ${PORT}`);
});
