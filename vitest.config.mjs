import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.js"],
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    exclude: ["dist/**", "node_modules/**", "coverage/**"],
    globals: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage"
    }
  }
});
