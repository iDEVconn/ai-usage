import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server/index.ts",
    react: "src/react/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["@nestjs/common", "@nestjs/swagger", "react", "@tanstack/react-query"],
});
