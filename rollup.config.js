import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";

//const typescript = require("@rollup/plugin-typescript")
//const {nodeResolve} = require("@rollup/plugin-node-resolve")

export default [
  {
    input: "src/index.ts",
    output: {
      file: "build/index.cjs",
      format: "cjs",
    },
    plugins: [typescript(), nodeResolve()],
    external: [
      "telegraf",
      "telegraf/helpers.js",
      "dotenv",
      "@prisma/client",
      "pino",
      "simple-node-logger",
      "memjs",
      "dayjs",
      "redis"
    ],
  },
];
