import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: "/bazeoffice/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined

          if (id.includes("@supabase/supabase-js")) {
            return "supabase-vendor"
          }

          if (id.includes("@tanstack/react-table")) {
            return "table-vendor"
          }

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("radix-ui") ||
            id.includes("@base-ui/react") ||
            id.includes("embla-carousel-react") ||
            id.includes("sonner")
          ) {
            return "framework"
          }

          if (id.includes("lucide-react")) {
            return "icons-vendor"
          }

          return undefined
        },
      },
    },
  },
})
