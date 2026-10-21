const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT) || 8000;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  let requestPath;
  try {
    requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  const relativePath = requestPath.replace(/^\/+/, "") || "index.html";
  const filePath = path.resolve(root, relativePath);
  const relativeFilePath = path.relative(root, filePath);
  if (relativeFilePath === ".." || relativeFilePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativeFilePath)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, fileStats) => {
    if (error || !fileStats.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Length": fileStats.size,
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Harmony Practice: http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Set PORT to another port and restart the server.`);
    process.exitCode = 1;
    return;
  }
  console.error("Could not start the local web server:", error.message);
  process.exitCode = 1;
});
