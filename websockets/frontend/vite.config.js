import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base matches the path the FastAPI backend mounts this app under (see backend/main.py)
export default defineConfig({
  plugins: [react()],
  base: "/frontend/",
  build: {
    outDir: "dist",
  },
});
