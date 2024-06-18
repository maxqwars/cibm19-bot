import { Cache } from "./Cache";
import crypto from "node:crypto";
import logger from "../logger";

export class Cryptography {
  private readonly _algorithm = "aes-256-cbc";

  private readonly _key: Buffer;
  private readonly _iv: Buffer;
  private readonly _cache: Cache;

  constructor(key: string, cache: Cache) {
    this._cache = cache;
    this._key = Buffer.from(key, "utf8");
    this._iv = crypto.randomBytes(16);

    logger.info(`[Cryptography.constructor] Encryption key length ${this._key.length}`);
  }

  encrypt(val: string) {
    const cipher = crypto.createCipheriv(this._algorithm, this._key, this._iv);
    let encrypted = cipher.update(val, "utf8", "hex");
    return (encrypted += cipher.final("hex"));
  }

  decrypt(val: string) {
    const decipher = crypto.createDecipheriv(this._algorithm, this._key, this._iv);

    let decrypted = decipher.update(val, "hex", "utf8");
    return (decrypted += decipher.final("utf8"));
  }
}
