const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const os = require("os");

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}


app.use(express.static(path.join(__dirname, "public")));

const rooms = {}; 
// rooms[roomId] = { host: ws, controllers: [] }

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg.toString());

    // JOIN ROOM
    if (data.type === "join") {
      const clientID = Math.random().toString(36).substring(2, 8);
      ws.id = clientID;
      ws.room = data.room;
      ws.role = data.role;

      if (!rooms[ws.room]) {
        rooms[ws.room] = { host: null, controllers: [] };
      }

      if (ws.role === "host") {
        rooms[ws.room].host = ws;
        console.log(`Host joined room ${ws.room}`);
      } else {
        rooms[ws.room].controllers.push(ws);
        console.log(`Controller joined room ${ws.room}`);
      }
    }

    // CONTROL EVENT
    if (data.type === "control") {
      const room = rooms[ws.room];
      if (room && room.host) {
        room.host.send(
          JSON.stringify({
            type: "control",
            action: data.action,
            id: ws.id,
          })
        );
      }
    }
  });

  ws.on("close", () => {
    if (!ws.room) return;

    const room = rooms[ws.room];
    if (!room) return;

    if (ws.role === "host") {
      room.host = null;
    } else {
      room.controllers = room.controllers.filter(c => c !== ws);
    }
  });
});

app.get("/server-ip", (req, res) => {
    res.json({
      ip: getLocalIP()
    });
  });
  
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
  
// server.listen(3000, () => {
//   console.log("Server running on http://localhost:3000");
// });
