import http from "http";
import fs from "fs/promises";
import path from "path";
import { createReadStream } from "fs";
import { fileURLToPath } from "url";

const scriptDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectRootPath = path.resolve(scriptDirectoryPath, "..");

const portArgument = process.argv[2];
const parsedPort = portArgument ? parseInt(portArgument, 10) : 3000;
if (Number.isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
  console.error("Usage: node scripts/serve-static-mjs.js [port]");
  process.exit(1);
}

const mimeTypesByExtension = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json"
};

function contentTypeForFile(absoluteFilePath) {
  const extension = path.extname(absoluteFilePath).toLowerCase();
  const mapped = mimeTypesByExtension[extension];
  if (mapped) {
    return mapped;
  }
  return "application/octet-stream";
}

function isPathInsideRoot(resolvedCandidatePath) {
  const resolvedRoot = path.resolve(projectRootPath);
  const resolvedCandidate = path.resolve(resolvedCandidatePath);
  if (resolvedCandidate === resolvedRoot) {
    return true;
  }
  const prefix = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : resolvedRoot + path.sep;
  return resolvedCandidate.startsWith(prefix);
}

async function resolveTargetFilePath(urlObject) {
  let pathname = urlObject.pathname;
  if (!pathname || pathname === "/") {
    pathname = "/";
  }
  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch (unusedDecodeError) {
    return null;
  }
  const pathWithoutLeadingSlash = decodedPathname.replace(/^\/+/, "");
  const candidatePath = path.resolve(projectRootPath, pathWithoutLeadingSlash);
  if (!isPathInsideRoot(candidatePath)) {
    return null;
  }
  let stats;
  try {
    stats = await fs.stat(candidatePath);
  } catch (unusedStatError) {
    return null;
  }
  if (stats.isDirectory()) {
    const indexPath = path.join(candidatePath, "index.html");
    try {
      const indexStats = await fs.stat(indexPath);
      if (indexStats.isFile()) {
        return indexPath;
      }
    } catch (unusedIndexError) {
      return null;
    }
    return null;
  }
  if (stats.isFile()) {
    return candidatePath;
  }
  return null;
}

const server = http.createServer((incomingMessage, serverResponse) => {
  if (incomingMessage.method !== "GET" && incomingMessage.method !== "HEAD") {
    serverResponse.writeHead(405, { Allow: "GET, HEAD" });
    serverResponse.end();
    return;
  }
  const requestUrl = incomingMessage.url;
  if (!requestUrl) {
    serverResponse.writeHead(400);
    serverResponse.end();
    return;
  }
  let urlObject;
  try {
    urlObject = new URL(requestUrl, "http://127.0.0.1");
  } catch (unusedUrlError) {
    serverResponse.writeHead(400);
    serverResponse.end();
    return;
  }
  resolveTargetFilePath(urlObject)
    .then((absoluteFilePath) => {
      if (!absoluteFilePath) {
        serverResponse.writeHead(404);
        serverResponse.end();
        return;
      }
      const contentType = contentTypeForFile(absoluteFilePath);
      serverResponse.writeHead(200, { "Content-Type": contentType });
      if (incomingMessage.method === "HEAD") {
        serverResponse.end();
        return;
      }
      const readStream = createReadStream(absoluteFilePath);
      readStream.on("error", () => {
        if (!serverResponse.headersSent) {
          serverResponse.writeHead(500);
        }
        serverResponse.end();
      });
      readStream.pipe(serverResponse);
    })
    .catch(() => {
      serverResponse.writeHead(500);
      serverResponse.end();
    });
});

server.on("error", (listenError) => {
  const errorCode = listenError && listenError.code;
  if (errorCode === "EADDRINUSE") {
    console.error(
      "Port " +
        parsedPort +
        " is already in use. Stop the other server on this port, or run npm run serve:5502, or pass a different port: node scripts/serve-static-mjs.js <port>"
    );
    process.exit(1);
    return;
  }
  throw listenError;
});

server.listen(parsedPort, () => {
  console.log(
    "Serving " + projectRootPath + " at http://localhost:" + parsedPort + "/"
  );
});
