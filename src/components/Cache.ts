import { Client } from "memjs";
import logger from "../logger";

export class Cache {
  private readonly _client: Client;
  private readonly _log = logger;

  constructor(client: Client) {
    this._client = client;
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      this._log.info(`[cache] Get cache value for key <${key}>...`);
      return new Promise((resolve, reject) => {
        this._client.get(key, (err, value) => {
          if (err) reject(err);
          resolve(value);
        });
      });
    } catch (err) {
      this._log.error(`[cache] Failed get cache value for key ${key}, reason:`);
      this._log.error(err.message);
      return null;
    }
  }

  async set(key: string, value: string, expires: number): Promise<any | null> {
    try {
      this._log.info(`[cache] Set cache value for key <${key}>, expires after ${expires} seconds`);
      return new Promise((resolve, reject) => {
        this._client.set(key, value, { expires }, (err, success) => {
          if (err) reject(err);
          resolve(value);
        });
      });
    } catch (err) {
      this._log.error(`[cache] Failed set cache value for key ${key}, reason:`);
      this._log.error(err.message);
      return null;
    }
  }

  async clean(key: string) {
    try {
      return new Promise((resolve, reject) => {
        this._client.set(key, "", { expires: 1000 }, (err, success) => {
          if (err) reject(err);
          resolve(success);
        });
      });
    } catch (err) {
      this._log.error(`[cache] failed clean key ${key}, reason:`);
      this._log.error(err.message);
      return null;
    }
  }
}
