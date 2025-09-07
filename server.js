const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Map voor video's
const recordingsDir = path.join(__dirname, "recordings");
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir);
}

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Multer setup voor uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, recordingsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Upload route
app.post("/upload-recording", upload.single("recording"), (req, res) => {
  res.send("✅ Video opgeslagen.");
});

// Lijst van opgeslagen video's
app.get("/videos5713", (req, res) => {
  const files = fs.readdirSync(recordingsDir);
  const items = files.map(f => {
    const url = `/videos5713/files/${encodeURIComponent(f)}`;
    return `
      <div class="card">
        <video src="${url}" controls></video>
        <div class="meta">${f}</div>
        <a href="${url}" download>⬇️ Download</a>
        <form method="POST" action="/delete-video" onsubmit="return confirm('Weet je zeker dat je dit bestand wilt verwijderen?');">
          <input type="hidden" name="filename" value="${f}" />
          <button type="submit">🗑️ Verwijder</button>
        </form>
      </div>`;
  }).join("");

  res.send(`
    <html>
      <head>
        <title>Video's</title>
        <style>
          body { font-family: sans-serif; background: #111; color: #fff; }
          h1 { text-align: center; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; padding: 20px; }
          .card { background: #222; padding: 10px; border-radius: 8px; }
          video { width: 100%; border-radius: 4px; }
          .meta { font-size: 0.9em; margin: 6px 0; }
          a, button { display: inline-block; margin-top: 6px; color: #fff; text-decoration: none; background: #444; padding: 6px 10px; border-radius: 4px; }
          button { border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>📂 Opgeslagen Video's</h1>
        <div class="grid">${items}</div>
      </body>
    </html>
  `);
});

// Route om video bestanden direct te serveren
app.use("/videos5713/files", express.static(recordingsDir));

// Verwijder route
app.post("/delete-video", express.urlencoded({ extended: true }), (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).send("Geen bestandsnaam opgegeven.");

  const filePath = path.join(recordingsDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Bestand niet gevonden.");
  }

  fs.unlinkSync(filePath);
  res.redirect("/videos5713");
});

// WebRTC signaling
io.on("connection", socket => {
  socket.on("offer", offer => socket.broadcast.emit("offer", offer));
  socket.on("answer", answer => socket.broadcast.emit("answer", answer));
  socket.on("ice-candidate", c => socket.broadcast.emit("ice-candidate", c));
});

server.listen(PORT, () => console.log(`Server draait op poort ${PORT}`));
