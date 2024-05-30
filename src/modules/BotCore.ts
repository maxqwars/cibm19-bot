import { Context, Telegraf } from "telegraf";
import { Scriptor } from "../helpers/Scriptor";
import { Update } from "telegraf/typings/core/types/typegram";
import logger from '../logger'

type CoreContextType = {
  volonteerId: number;
  volonteerRole: string;
  volonteerName: string;
  telegramId: number;
  telegramUsername: number;
  telegramName: string;
  flowKey: string;
  lastMessage: string;
};

type CoreDependenciesType = {};

type CoreOptionsType = {
  preDefinedAdmins: number[];
  scripts: Scriptor[];
};

interface IBotCoreConstructable {
  new(options: CoreOptionsType, dependencies: CoreDependenciesType): IBotCore;
}

interface IBotCore {
  generateFlowToScriptMap(): IBotCore;
  bindEntryPoints(bot: Telegraf<Context<Update>>): IBotCore

  rawMessage(context: Context): Promise<void>;
  flushFlow(id: number): Promise<void>;
  getContext(telegramId: number): Promise<void>;
}

export class BotCore implements IBotCore {
  private readonly _scripts: Scriptor[];
  private readonly _preDefinedAdmins: number[];

  private _flowKeyToScriptMap: { [key: string]: Function };

  constructor(options: CoreOptionsType, dependencies: CoreDependenciesType) {
    this._scripts = options.scripts;
    this._preDefinedAdmins = options.preDefinedAdmins;
  }

  bindEntryPoints(bot: Telegraf<Context<Update>>): IBotCore {

    for (const script of this._scripts) {
      const { command, cb } = script.entryPoint
      bot.command(command, async (context: Context) => cb(context, this))
      logger.info(`Binding ${command}->${script.name}`)
    }

    return this
  }

  flushFlow(id: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getContext(telegramId: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  rawMessage(context: Context<Update>): Promise<void> {
    throw new Error("Method not implemented.");
  }

  generateFlowToScriptMap(): IBotCore {
    return this
  }
}
