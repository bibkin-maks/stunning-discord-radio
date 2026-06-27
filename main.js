const { app, BrowserWindow, session, desktopCapturer } = require("electron");
const http = require("http");
const { Readable } = require("stream");

let proxyPort = 0;

function startProxy() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const u = new URL(req.url, "http://127.0.0.1");
      if (u.pathname !== "/stream") {
        res.writeHead(404);
        res.end();
        return;
      }
      const target = u.searchParams.get("url");
      if (!target || !/^https?:\/\//i.test(target)) {
        res.writeHead(400);
        res.end("bad url");
        return;
      }
      try {
        const upstream = await fetch(target, {
          headers: { "User-Agent": "discord-radio/0.1", "Icy-MetaData": "0" },
        });
        if (!upstream.ok || !upstream.body) {
          res.writeHead(502);
          res.end("upstream error " + upstream.status);
          return;
        }
        res.writeHead(200, {
          "Content-Type": upstream.headers.get("content-type") || "audio/mpeg",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        });
        Readable.fromWeb(upstream.body).pipe(res);
        req.on("close", () => {
          try { res.destroy(); } catch {}
        });
      } catch (e) {
        res.writeHead(502);
        res.end(String(e));
      }
    });
    server.listen(0, "127.0.0.1", () => {
      proxyPort = server.address().port;
      resolve();
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 440,
    height: 660,
    title: "Discord Audio",
    webPreferences: { contextIsolation: true },
  });
  win.loadFile("index.html", { query: { port: String(proxyPort) } });
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(true));

  // Auto-approve system audio capture via getDisplayMedia — picks first screen
  // with WASAPI loopback so the renderer gets system audio without a picker dialog.
  session.defaultSession.setDisplayMediaRequestHandler((_req, callback) => {
    desktopCapturer.getSources({ types: ["screen"] }).then((sources) => {
      callback({ video: sources[0], audio: "loopback" });
    });
  });

  await startProxy();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
