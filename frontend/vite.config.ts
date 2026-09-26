import { defineConfig } from "vite";

// Proxies API calls to the local backend during development so the browser
// never needs a cross-origin request or a public API key.
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
