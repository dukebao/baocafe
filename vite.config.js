import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function appRouteFallback() {
  return {
    name: "app-route-fallback",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && /^\/(order|barista|admin)(\/|\?|$)/.test(req.url)) {
          req.url = "/app.html";
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl =
    env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  return {
    plugins: [appRouteFallback(), react()],
    build: {
      rollupOptions: {
        input: {
          index: "index.html",
          app: "app.html"
        }
      }
    },
    define: {
      __SUPABASE_URL__: JSON.stringify(supabaseUrl),
      __SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey)
    }
  };
});
