import { IBuildInLogger } from "./BuildInLogger";
import type { RedisClientType } from "redis";

export class Cache {
  private readonly _client: RedisClientType;
  private readonly _log: IBuildInLogger;

  constructor(client: RedisClientType, logger: IBuildInLogger) {
    this._client = client;
    this._log = logger;
  }

  async get(key: string): Promise<string | null> {
    return await this._client.get(key);
  }

  async set(key: string, value: string, expiresAfter = 60) {
    return await this._client.set(key, value, {
      EX: expiresAfter * 1000,
    });
  }

  async clean(key: string) {
    return await this._client.del(key);
  }

  // async get(key: string): Promise<Buffer | null> {
  //   try {
  //     this._log.info(`[cache] Get cache value for key <${key}>...`);
  //     return new Promise((resolve, reject) => {
  //       this._client.get(key, (err, value) => {
  //         if (err) reject(err);
  //         resolve(value);
  //       });
  //     });
  //   } catch (err) {
  //     this._log.error(`[cache] Failed get cache value for key ${key}, reason:`);
  //     this._log.error(err.message);
  //     return null;
  //   }
  // }

  // async set(key: string, value: string, expires: number): Promise<any | null> {
  //   try {
  //     this._log.info(`[cache] Set cache value for key <${key}>, expires after ${expires} seconds`);
  //     return new Promise((resolve, reject) => {
  //       this._client.set(key, value, { expires }, (err, success) => {
  //         if (err) reject(err);
  //         resolve(value);
  //       });
  //     });
  //   } catch (err) {
  //     this._log.error(`[cache] Failed set cache value for key ${key}, reason:`);
  //     this._log.error(err.message);
  //     return null;
  //   }
  // }

  // async clean(key: string) {
  //   try {
  //     return new Promise((resolve, reject) => {
  //       this._client.set(key, "", { expires: 1000 }, (err, success) => {
  //         if (err) reject(err);
  //         resolve(success);
  //       });
  //     });
  //   } catch (err) {
  //     this._log.error(`[cache] failed clean key ${key}, reason:`);
  //     this._log.error(err.message);
  //     return null;
  //   }
  // }
}
