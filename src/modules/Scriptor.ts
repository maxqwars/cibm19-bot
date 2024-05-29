import { Context } from "telegraf";
import { BotCore, BotCoreContextType } from "../modules/BotCore";

export type ScriptorOptionsType = {
  scriptKeys: string[];
  scriptName: string;
};

export type ScriptorDependencies = {
  core: BotCore;
};

export type ScriptorScript = {
  (context: Context, coreCtx: BotCoreContextType, core: BotCore): Promise<void>;
};

export class Scriptor {
  private readonly _keys: string[];
  private readonly _name: string;
  private readonly _script: Function;
  private readonly _core: BotCore;

  constructor(
    options: ScriptorOptionsType,
    deps: ScriptorDependencies,
    script: Function,
  ) {
    this._keys = options.scriptKeys;
    this._name = options.scriptName;
    this._script = script;
    this._core = deps.core;
  }

  get keys() {
    return this._keys;
  }

  getScript() {
    return this._script(this._core);
  }
}
