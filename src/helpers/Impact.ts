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

export class Impact implements IImpact {
  public readonly signature: RegExp;
  public readonly name: string;
  public readonly callback: QueryCallbackType;

  constructor(options: ImpactOptionsType) {
    this.callback = options.callback;
    this.signature = options.signature;
    this.name = options.name;
  }
}
