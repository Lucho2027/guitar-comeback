import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  server: {
    host: "100.82.95.34",
    port: 5175,
    strictPort: true,
    allowedHosts: [".ts.net", "omarchy-agent-lenovo.tail3148da.ts.net", "100.82.95.34"],
    hmr: {
      host: "omarchy-agent-lenovo.tail3148da.ts.net",
      protocol: "ws",
      clientPort: 5175,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8090",
        changeOrigin: true,
      },
    },
  },
});
