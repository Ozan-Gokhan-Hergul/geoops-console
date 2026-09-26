import { defineConfig } from "vitest/config";

// Without this, Vitest's default recursive discovery also picks up
// frontend/test/*.test.ts, which has its own separate test runner.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
});
