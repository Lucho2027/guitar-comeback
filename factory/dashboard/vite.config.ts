import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { fileURLToPath } from "node:url";
import { factoryFiles } from "./factory-files";

// Serves ../board.json and ../jobs/** read-only. FACTORY_DEMO=1 serves ./demo instead.
const dir = fileURLToPath(new URL(process.env.FACTORY_DEMO ? "./demo" : "..", import.meta.url));
// Tailscale address, like web/vite.config.ts, so other tailnet devices can open it. Override with FACTORY_HOST.
const host = process.env.FACTORY_HOST ?? "100.82.95.34";
const port = Number(process.env.FACTORY_PORT ?? 5176);
const allowedHosts = [".ts.net"];

export default defineConfig({
  plugins: [solid(), factoryFiles(dir)],
  server: { host, port, strictPort: true, allowedHosts },
  preview: { host, port, strictPort: true, allowedHosts },
});
