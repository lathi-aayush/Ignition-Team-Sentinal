import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const nm = (pkg) => `node_modules/${pkg}`;

/** Split heavy node_modules; avoid circular deps (react/polyfills must not pull vendor). */
function manualChunks(id) {
  if (!id.includes("node_modules")) return;

  // Keep with the lazy Studio Analytics route (avoids broken split + smaller initial vendor).
  if (id.includes(nm("recharts")) || id.includes("/d3-") || id.includes("/d3/")) return;

  if (id.includes(nm("@perawallet"))) return "pera";

  if (
    id.includes(nm("vite-plugin-node-polyfills")) ||
    id.includes(nm("node-stdlib-browser")) ||
    id.includes(nm("crypto-browserify")) ||
    id.includes(nm("stream-browserify")) ||
    id.includes(nm("buffer/")) ||
    id.includes(nm("vm-browserify")) ||
    id.includes(nm("browserify-")) ||
    id.includes(nm("process/"))
  ) {
    return "polyfills";
  }

  if (id.includes(nm("@xyflow")) || id.includes(nm("@reactflow")) || id.includes(nm("elkjs"))) return "xyflow";
  if (id.includes(nm("@tiptap")) || id.includes("prosemirror")) return "tiptap";
  // Do not split recharts/d3 — isolated chunks break lodash `_` interop (_ is not a function).
  if (id.includes(nm("framer-motion"))) return "motion";
  if (id.includes(nm("react-router"))) return "router";
  if (id.includes(nm("react-dom")) || id.includes(nm("react/")) || id.includes(nm("scheduler"))) return "react";
  if (id.includes(nm("@tanstack"))) return "query";

  return "vendor";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_PROXY_TARGET?.trim() || "http://127.0.0.1:5000";

  return {
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },
    build: {
      chunkSizeWarningLimit: 1100,
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
    plugins: [
      react(),
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
    ],
    define: {
      global: "globalThis",
    },
    optimizeDeps: {
      include: [
        "algosdk",
        "recharts",
        "@txnlab/use-wallet-react",
        "@txnlab/use-wallet",
        "@blockshake/defly-connect",
        "@agoralabs-sh/avm-web-provider",
        "lute-connect",
      ],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/outputs": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/x402-test": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
