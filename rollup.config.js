import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default [
  {
    input: "src/index.ts",
    output: {
      file: "build/index.mjs",
      format: "es",
    },
    plugins: [typescript(), nodeResolve()],
    external: ["telegraf", "telegraf/helpers.js", "dotenv", "@prisma/client", "pino", "dayjs", "redis"],
  },
];
