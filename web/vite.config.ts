import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

// WEB_PORT and API_PORT let factory previews run one copy per branch side by side.
const webPort = Number(process.env.WEB_PORT ?? 5175);
const apiPort = Number(process.env.API_PORT ?? 8090);

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  server: {
    host: "100.82.95.34",
    port: webPort,
    strictPort: true,
    allowedHosts: [".ts.net", "omarchy-agent-lenovo.tail3148da.ts.net", "100.82.95.34"],
    hmr: {
      host: "omarchy-agent-lenovo.tail3148da.ts.net",
      protocol: "ws",
      clientPort: webPort,
    },
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
});
