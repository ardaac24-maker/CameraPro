const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ── Static frontend
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// ── Opnamemap
const recordingsDir = path.join(__dirname, "recordings");
if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir);

// ── Multer opslag voor opnames
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, recordingsDir),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const base = (req.body && req.body.title) ? String(req.body.title).replace(/[^\w\-]+/g, "_") : "opname";
    cb(null, `${base}_${ts}.webm`);
  }
});
const upload = multer({ storage });

// ── Upload endpoint voor opnames (door streamer bewust verstuurd)
app.post("/upload-recording", upload.single("recording"), (req, res) => {
  if (!req.file) return res.status(400).send("Geen bestand ontvangen.");
  return res.status(200).send("✅ Opname opgeslagen.");
});

// ── Video galerij: /videos5713 (HTML lijst)
app.get("/videos5713", (req, res) => {
  const files = fs.readdirSync(recordingsDir).filter(f => f.endsWith(".webm")).sort().reverse();
  const items = files.map(f => {
    const url = `/videos5713/files/${encodeURIComponent(f)}`;
    return `
      <div class="card">
        <video src="${url}" controls></video>
        <div class="meta">${f}</div>
        <a href="${url}" download>⬇️ Download</a>
      </div>`;
  }).join("");

  res.send(`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8"/>
<title>Opnames — /videos5713</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; }
  h1 { margin-bottom: 8px; }
  .note { color:#333; margin: 8px 0 16px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:16px; }
  .card { border:1px solid #ddd; border-radius:12px; padding:12px; }
  video { width:100%; border-radius:8px; display:block; }
  .meta { font-size:12px; color:#555; margin-top:6px; word-break:break-all; }
  a { text-decoration:none; }
  .topnav { margin-bottom: 16px; }
  .topnav a { margin-right: 12px; }
</style>
</head>
<body>
  <div class="topnav">
    <a href="/">📡 Live starten</a>
    <a href="/watch.html">👀 Live kijken</a>
  </div>
  <h1>📺 Opnames</h1>
  <div class="note">${files.length ? "Klik om terug te kijken of te downloaden." : "Er zijn nog geen opnames."}</div>
  <div class="grid">${items}</div>
</body>
</html>`);
});

// ── Bestanden zelf serveren
app.use("/videos5713/files", express.static(recordingsDir));

// ── Socket.IO voor WebRTC signalling (1 streamer ↔ 1 kijker)
io.on("connection", (socket) => {
  // Offer/Answer en ICE-candidates doorgeven
  socket.on("offer", (offer) => socket.broadcast.emit("offer", offer));
  socket.on("answer", (answer) => socket.broadcast.emit("answer", answer));
  socket.on("ice-candidate", (candidate) => socket.broadcast.emit("ice-candidate", candidate));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server draait op poort", PORT));
