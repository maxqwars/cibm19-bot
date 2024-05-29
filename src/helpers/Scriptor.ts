import { BotCore, BotCoreContextType } from "../modules/BotCore";
import { Context } from "telegraf";

export type HandlerType = {
  (
    context: Context,
    coreContext: BotCoreContextType,
    core: BotCore,
  ): Promise<unknown>;
};

type ScriptorOptionsType = {
  stages: string[];
  startStage?: string;
  endStage?: string;
  handler: HandlerType;
};

export class Scriptor {
  private readonly _stages: string[];
  private readonly _startStage: string;
  private readonly _endStage: string;
  private readonly _handler: {
    (
      context: Context,
      coreContext: BotCoreContextType,
      core: BotCore,
    ): Promise<unknown>;
  };

  constructor(options: ScriptorOptionsType) {
    this._stages = options.stages;
    this._startStage = options.startStage || options.stages[0];
    this._endStage =
      options.endStage || options.stages[options.stages.length - 1];
    this._handler = options.handler;
  }

  get startStage() {
    return this._startStage;
  }

  get endStage() {
    return this._endStage;
  }

  get stages() {
    return this._stages;
  }

  get handler() {
    return this._handler;
  }
}
