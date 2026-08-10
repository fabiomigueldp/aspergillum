import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@minecraft/server": fileURLToPath(new URL("./tests/mocks/minecraft-server.ts", import.meta.url)),
    },
  },
});
