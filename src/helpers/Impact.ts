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
  signatureRegExp: RegExp;
  callback: QueryCallbackType;
};

export interface IImpactSonstructable {
  new (options: ImpactOptionsType): IImpact;
}

export interface IImpact {}

export default class Impact implements IImpact {}
