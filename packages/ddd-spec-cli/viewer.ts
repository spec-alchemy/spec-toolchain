import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { access, readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { logInfo } from "./console.js";
import type { ResolvedDddSpecConfig } from "./config.js";

const DEFAULT_VIEWER_HOST = "127.0.0.1";
const DEFAULT_VIEWER_PORT = 4173;
const VIEWER_INDEX_FILE = "index.html";
const VIEWER_SPEC_ROUTE_PATH = "/generated/viewer-spec.json";
const VIEWER_ASSET_DIR_CANDIDATES = [
  fileURLToPath(new URL("./static/viewer", import.meta.url)),
  resolve(fileURLToPath(new URL(".", import.meta.url)), "dist", "ddd-spec-cli", "static", "viewer")
] as const;

export interface LaunchViewerOptions {
  assetDirPath: string;
  host: string;
  openBrowser: boolean;
  port: number;
  viewerSpecPath: string;
}

export interface ViewerCommandHooks {
  launchViewer?: (options: LaunchViewerOptions) => Promise<void>;
}

export interface StartDddSpecViewerOptions {
  args?: readonly string[];
  hooks?: ViewerCommandHooks;
  openBrowserByDefault?: boolean;
}

export async function startDddSpecViewer(
  config: ResolvedDddSpecConfig,
  options: StartDddSpecViewerOptions = {}
): Promise<void> {
  const viewerSpecPath = requireViewerOutputPath(config);
  const assetDirPath = await requireViewerAssetDirPath();
  const hooks = options.hooks ?? {};

  await (hooks.launchViewer ?? launchViewerServer)({
    assetDirPath,
    viewerSpecPath,
    ...parseViewerArgs(options.args ?? [], {
      defaultOpenBrowser: options.openBrowserByDefault ?? false
    })
  });
}

function requireViewerOutputPath(config: ResolvedDddSpecConfig): string {
  if (config.outputs.viewerPath) {
    return config.outputs.viewerPath;
  }

  throw new Error("DDD spec config must define outputs.viewer for the viewer command");
}

async function requireViewerAssetDirPath(): Promise<string> {
  for (const candidatePath of VIEWER_ASSET_DIR_CANDIDATES) {
    if (await pathExists(join(candidatePath, VIEWER_INDEX_FILE))) {
      return candidatePath;
    }
  }

  throw new Error(
    "Unable to locate packaged viewer assets. Run `npm run build --workspace=packages/ddd-spec-cli` before launching the viewer."
  );
}

async function launchViewerServer(options: LaunchViewerOptions): Promise<void> {
  const server = createServer((request, response) => {
    void handleViewerRequest(request, response, options).catch((error: unknown) => {
      if (response.headersSent) {
        response.destroy(error instanceof Error ? error : undefined);
        return;
      }

      sendTextResponse(
        response,
        500,
        `Failed to serve viewer request: ${toErrorMessage(error)}`,
        "text/plain; charset=utf-8"
      );
    });
  });

  const address = await listen(server, options.host, options.port);
  const viewerUrl = formatViewerUrl(address.port);
  const bindSuffix =
    options.host === DEFAULT_VIEWER_HOST ? "" : ` (bound to ${address.host})`;

  logInfo(`viewer available at ${viewerUrl}${bindSuffix}`);

  if (options.openBrowser) {
    openBrowser(viewerUrl);
  }

  await waitForShutdown(server);
}

async function handleViewerRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: LaunchViewerOptions
): Promise<void> {
  const requestUrl = new URL(request.url ?? "/", "http://ddd-spec-viewer.local");

  if (requestUrl.pathname === VIEWER_SPEC_ROUTE_PATH) {
    await sendFileResponse(response, options.viewerSpecPath, {
      cacheControl: "no-store",
      contentType: "application/json; charset=utf-8"
    });
    return;
  }

  const assetPath = await resolveViewerAssetPath(options.assetDirPath, requestUrl.pathname);

  if (!assetPath) {
    sendTextResponse(response, 404, "Not Found", "text/plain; charset=utf-8");
    return;
  }

  await sendFileResponse(response, assetPath, {
    cacheControl: assetPath.endsWith(".html")
      ? "no-cache"
      : "public, max-age=31536000, immutable",
    contentType: getContentType(assetPath)
  });
}

async function resolveViewerAssetPath(
  assetDirPath: string,
  requestPathname: string
): Promise<string | undefined> {
  if (requestPathname === "/" || requestPathname.length === 0) {
    return join(assetDirPath, VIEWER_INDEX_FILE);
  }

  const segments = requestPathname
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => decodeURIComponent(segment));

  if (
    segments.some(
      (segment) =>
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\")
    )
  ) {
    return undefined;
  }

  const candidatePath = join(assetDirPath, ...segments);
  const candidateStats = await safeStat(candidatePath);

  if (candidateStats?.isFile()) {
    return candidatePath;
  }

  if (extname(requestPathname).length === 0) {
    return join(assetDirPath, VIEWER_INDEX_FILE);
  }

  return undefined;
}

async function sendFileResponse(
  response: ServerResponse,
  path: string,
  options: {
    cacheControl: string;
    contentType: string;
  }
): Promise<void> {
  try {
    const fileContents = await readFile(path);

    response.writeHead(200, {
      "cache-control": options.cacheControl,
      "content-type": options.contentType,
      "content-length": Buffer.byteLength(fileContents).toString()
    });
    response.end(fileContents);
  } catch (error: unknown) {
    const code = isMissingFileError(error) ? 404 : 500;
    const message = isMissingFileError(error)
      ? `Missing viewer asset: ${path}`
      : `Failed to read ${path}: ${toErrorMessage(error)}`;

    sendTextResponse(response, code, message, "text/plain; charset=utf-8");
  }
}

function sendTextResponse(
  response: ServerResponse,
  statusCode: number,
  body: string,
  contentType: string
): void {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": contentType,
    "content-length": Buffer.byteLength(body).toString()
  });
  response.end(body);
}

async function listen(
  server: ReturnType<typeof createServer>,
  host: string,
  port: number
): Promise<{
  host: string;
  port: number;
}> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(port, host, () => {
      server.off("error", rejectPromise);
      resolvePromise();
    });
  }).catch((error: unknown) => {
    throw new Error(
      `Failed to start viewer server on ${host}:${port}: ${toErrorMessage(error)}`
    );
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Viewer server started without a TCP address");
  }

  return {
    host: address.address,
    port: address.port
  };
}

async function waitForShutdown(server: ReturnType<typeof createServer>): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const closeServer = () => {
      server.close((error) => {
        if (error) {
          rejectPromise(error);
          return;
        }

        resolvePromise();
      });
    };
    const handleSignal = () => {
      process.off("SIGINT", handleSignal);
      process.off("SIGTERM", handleSignal);
      closeServer();
    };

    process.on("SIGINT", handleSignal);
    process.on("SIGTERM", handleSignal);
    server.once("close", () => {
      process.off("SIGINT", handleSignal);
      process.off("SIGTERM", handleSignal);
      resolvePromise();
    });
    server.once("error", rejectPromise);
  });
}

function parseViewerArgs(
  args: readonly string[],
  options: {
    defaultOpenBrowser: boolean;
  }
): {
  host: string;
  openBrowser: boolean;
  port: number;
} {
  let host = DEFAULT_VIEWER_HOST;
  let openBrowser = options.defaultOpenBrowser;
  let port = DEFAULT_VIEWER_PORT;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--host") {
      const nextArg = args[index + 1];

      if (!nextArg || nextArg.startsWith("--")) {
        host = "0.0.0.0";
        continue;
      }

      host = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith("--host=")) {
      host = arg.slice("--host=".length) || "0.0.0.0";
      continue;
    }

    if (arg === "--port") {
      const nextArg = args[index + 1];

      if (!nextArg) {
        throw new Error("--port requires a numeric value");
      }

      port = parsePort(nextArg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      port = parsePort(arg.slice("--port=".length));
      continue;
    }

    if (arg === "--open") {
      openBrowser = true;
      continue;
    }

    if (arg === "--no-open") {
      openBrowser = false;
      continue;
    }

    throw new Error(`Unknown viewer option: ${arg}`);
  }

  return {
    host,
    openBrowser,
    port
  };
}

function parsePort(rawPort: string): number {
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Viewer port must be an integer between 0 and 65535; received ${rawPort}`);
  }

  return port;
}

function formatViewerUrl(port: number): string {
  return `http://localhost:${port}/`;
}

function openBrowser(url: string): void {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args =
    process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, {
    detached: process.platform !== "win32",
    stdio: "ignore"
  });

  child.once("error", (error) => {
    logInfo(`unable to open a browser automatically: ${toErrorMessage(error)}`);
  });
  child.unref();
}

function getContentType(path: string): string {
  switch (extname(path)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function safeStat(path: string): Promise<Awaited<ReturnType<typeof stat>> | undefined> {
  try {
    return await stat(path);
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return undefined;
    }

    throw error;
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
