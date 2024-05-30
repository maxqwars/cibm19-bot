import { Context } from "telegraf";
import { BotCore } from "../modules/BotCore";
import { Update } from "telegraf/typings/core/types/typegram";

type EntryPointType = {
  command: string;
  cb: { (context: Context, core: BotCore): Promise<void> };
};

type StageHandlerType = {
  (context: Context, core: BotCore): Promise<void>;
};

type KeyToHandlerMapItemType = {
  key: string;
  handler: StageHandlerType;
  afterKey: string;
  afterErrKey: string;
};

type ScriptorOptionsType = {
  flowKeys: string[];
  entryPoint: EntryPointType;
};

interface IScriptor {
  flowKeys: string[];
  addStage(
    key: string,
    handler: StageHandlerType,
    afterKey: string,
    afterErrKey?: string,
  ): IScriptor;
  execute(context: Context, core: BotCore): Promise<void>;
}

interface IScriptorConstructable {
  new (options: ScriptorOptionsType): IScriptor;
}

export class Scriptor implements IScriptor {
  private readonly _flowKeys: string[];
  private readonly _keyToHandleMap: { [key: string]: KeyToHandlerMapItemType };

  constructor(options: ScriptorOptionsType) {}

  execute(context: Context<Update>, core: BotCore): Promise<void> {
    throw new Error("Method not implemented.");
  }

  get flowKeys() {
    return this._flowKeys;
  }

  addStage(
    key: string,
    handler: StageHandlerType,
    afterKey: string,
    afterErrKey = "",
  ): IScriptor {
    this._keyToHandleMap[key] = {
      key,
      handler,
      afterKey,
      afterErrKey,
    };

    this._flowKeys.push(key);

    return this;
  }
}
