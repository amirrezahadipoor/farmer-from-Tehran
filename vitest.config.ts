import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // P5.11: پوششِ «منطق بازی» در CI سنجیده می‌شود و زیر ۸۰٪ بیلد را رد می‌کند
    coverage: {
      provider: "v8",
      include: ["src/game/sim/**/*.ts", "src/game/sound/**/*.ts", "src/server/**/*.ts", "src/game/story.ts", "src/game/persist.ts", "src/game/data.ts"],
      reporter: ["text-summary", "text", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
