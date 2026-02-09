import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const frontendPort = parseInt(process.env.VITE_PORT) || 5173;
const backendPort = process.env.PORT || 3000;
const backendUrl = `http://localhost:${backendPort}`;

export default defineConfig({
  plugins: [vue()],
  server: {
    port: frontendPort,
    proxy: {
      "/api": backendUrl,
      "/files": backendUrl,
      "/data": backendUrl
    }
  }
});
