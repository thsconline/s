import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],

    build: {
        outDir: "dist",
        emptyOutDir: true,

        rollupOptions: {
            input: "app.jsx",

            output: {
                entryFileNames: "app.js",
                chunkFileNames: "assets/[name]-[hash].js",
                assetFileNames: "assets/[name]-[hash][extname]"
            }
        }
    }
});
