import { Context } from "telegraf";
import { IBotCore } from "../modules/BotCore";
import { Update } from "telegraf/typings/core/types/typegram";
import logger from "../logger";

const MOD_NAME = "[Impact]";

type QueryCallbackType = {
  (context: Context, core: IBotCore): Promise<void>;
};

type ImpactOptionsType = {
  name: string;
  signatureRegExp: RegExp;
  callback: QueryCallbackType;
};

interface IImpactSonstructable {
  new (options: ImpactOptionsType): IImpact;
}

interface IImpact {}

export default class Impact implements IImpact {}
