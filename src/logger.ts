import { createSimpleLogger } from "simple-node-logger";

export function createLogger(mode: "development" | "production" = "production") {
  // return createSimpleLogger({ level: mode === "development" ? "debug" : "info" });
  return createSimpleLogger ()
}
      