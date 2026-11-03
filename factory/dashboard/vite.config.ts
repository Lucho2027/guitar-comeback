import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { fileURLToPath } from "node:url";
import { factoryApi } from "./server/api";

// Board and job files come from .. (factory/). FACTORY_DEMO=1 serves ./demo instead. Previews always use the real repo.
const dir = fileURLToPath(new URL(process.env.FACTORY_DEMO ? "./demo" : "..", import.meta.url));
// The repo checkout that holds main; job worktrees live in its .worktrees/.
const root = fileURLToPath(new URL("../..", import.meta.url)).replace(/\/$/, "");
// Tailscale address, like web/vite.config.ts, so other tailnet devices can open it. Override with FACTORY_HOST.
const host = process.env.FACTORY_HOST ?? "100.82.95.34";
const port = Number(process.env.FACTORY_PORT ?? 5176);
const allowedHosts = [".ts.net"];

export default defineConfig({
  plugins: [solid(), factoryApi(dir, root)],
  server: { host, port, strictPort: true, allowedHosts },
  preview: { host, port, strictPort: true, allowedHosts },
});
