import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["@babel/plugin-proposal-decorators", { legacy: true }]],
      },
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "dist",
    // Ensure environment variables are replaced at build time
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  // Define environment variables that should be replaced
  define: {
    "process.env.VITE_API_URL": JSON.stringify(process.env.VITE_API_URL),
    "process.env.VITE_WS_URL": JSON.stringify(process.env.VITE_WS_URL),
  },
});
