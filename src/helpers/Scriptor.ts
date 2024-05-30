import { Context } from "telegraf";
import { BotCore, CoreContextType } from "../modules/BotCore";
import { Update } from "telegraf/typings/core/types/typegram";
import logger from "../logger";

type EntryPointType = {
  command: string;
  cb: { (context: Context, core: BotCore): Promise<void> };
};

type StageHandlerType = {
  (context: Context, core: BotCore): Promise<void>;
};

type KeyToHandlerMapItemType = {
  handler: StageHandlerType;
};

type ScriptorOptionsType = {
  name: string;
  entryPoint: EntryPointType;
};

interface IScriptor {
  flowKeys: string[];
  addStage(handler: StageHandlerType): IScriptor;
  execute(
    key: string,
    context: Context<Update>,
    coreContext: CoreContextType,
    core: BotCore,
  ): Promise<void>;
  entryPoint: EntryPointType;
  name: string;
}

interface IScriptorConstructable {
  new (options: ScriptorOptionsType): IScriptor;
}

export class Scriptor implements IScriptor {
  private readonly _name: string;
  private readonly _flowKeys: string[];
  private readonly _entryPoint: EntryPointType;
  private _keyToHandleMap: { [key: string]: KeyToHandlerMapItemType };

  constructor(options: ScriptorOptionsType) {
    this._name = options.name;
    this._flowKeys = [];
    this._entryPoint = options.entryPoint;
    this._keyToHandleMap = {};
  }

  get flowKeys() {
    return this._flowKeys;
  }

  get entryPoint() {
    return this._entryPoint;
  }

  get name() {
    return this._name;
  }

  async execute(
    key: string,
    context: Context<Update>,
    coreContext: CoreContextType,
    core: BotCore,
  ): Promise<void> {
    logger.info(`Scriptor: Execution "${key}"...`);

    try {
      const { handler } = this._keyToHandleMap[key];
      await handler(context, core);
    } catch (err) {
      return null;
    }
  }

  addStage(handler: StageHandlerType): IScriptor {
    const key =
      this._flowKeys.length === 0
        ? `${this._name}_1`
        : `${this._name}_${this._flowKeys.length + 1}`;

    this._keyToHandleMap[key] = {
      handler,
    };

    this._flowKeys.push(key);

    return this;
  }
}
