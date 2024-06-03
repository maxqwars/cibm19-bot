import { Context } from "telegraf";
import { IBotCore } from "../modules/BotCore";
import { Update } from "telegraf/typings/core/types/typegram";
import logger from "../logger";

const MOD_NAME = "[Impact]";

type QueryCallbackType = {
  (context: Context<Update.CallbackQueryUpdate>, core: IBotCore): Promise<void>;
};

type ImpactOptionsType = {
  name: string;
  signature: RegExp;
  callback: QueryCallbackType;
};

export interface IImpactConstructable {
  new (options: ImpactOptionsType): IImpact;
}

export interface IImpact {
  signature: RegExp;
  name: string;
  callback: QueryCallbackType;
}

export default class Impact implements IImpact {
  private readonly _signature: RegExp;
  private readonly _name: string;
  private readonly _callback: QueryCallbackType;

  constructor(options: ImpactOptionsType) {
    this._callback = options.callback;
    this._signature = options.signature;
    this._name = options.name;
  }

  get signature() {
    return this.signature;
  }

  get name() {
    return this._name;
  }

  get callback() {
    return this._callback;
  }
}
