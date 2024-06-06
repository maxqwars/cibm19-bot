import { createHash } from "node:crypto";

export function calcMd5(source: string) {
  return createHash("md5").update(source).digest("hex");
}
