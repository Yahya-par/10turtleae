import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    host: true,
    port: 13008,
    allowedHosts: ["172.168.16.50", "172.168.16.245"],
  },
  // SPA prerender runs the SSR bundle in Node. GSAP ships ESM without
  // "type":"module", which breaks on some Node versions when left external.
  ssr: {
    noExternal: ["gsap"],
  },
  plugins: [
    remix({
      ssr: false,
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
});
