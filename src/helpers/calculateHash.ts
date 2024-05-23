import { createHash } from "node:crypto";

export function calculateHash(val: string): string {
  return createHash("md5").update(val).digest("hex");
}
