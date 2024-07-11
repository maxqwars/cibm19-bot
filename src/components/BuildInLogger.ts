import { pino, Logger } from "pino";

export type LOG_LEVELS = "all" | "debug" | "error";

export interface IBuildInLogger {
  info(msg: string): void;
  debug(msg: string): void;
  error(msg: string): void;
}

export class BuildInLogger implements IBuildInLogger {
  private _innerLogger: Logger;

  constructor(level: LOG_LEVELS = "all") {
    this._innerLogger = pino();
  }

  info(msg: string): void {
    this._innerLogger.info(msg);
  }

  debug(msg: string): void {
    this._innerLogger.debug(msg);
  }

  error(msg: string): void {
    this._innerLogger.error(msg);
  }
}
