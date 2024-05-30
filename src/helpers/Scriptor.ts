import { Context } from "telegraf";
import { BotCore, CoreContextType } from "../modules/BotCore";
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
  name: string;
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
  execute(
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
    this._flowKeys = options.flowKeys;
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

  execute(
    context: Context<Update>,
    coreContext: CoreContextType,
    core: BotCore,
  ): Promise<void> {
    throw new Error("Method not implemented.");
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
