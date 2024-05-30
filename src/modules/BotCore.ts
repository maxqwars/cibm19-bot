import { Context, Telegraf } from "telegraf";
import { Scriptor } from "../helpers/Scriptor";
import { Update } from "telegraf/typings/core/types/typegram";
import logger from "../logger";

export type CoreContextType = {
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
  new (options: CoreOptionsType, dependencies: CoreDependenciesType): IBotCore;
}

interface IBotCore {
  generateFlowToScriptMap(): IBotCore;
  bindEntryPoints(bot: Telegraf<Context<Update>>): IBotCore;
  bindOnMessageEvent(bot: Telegraf<Context<Update>>): IBotCore;
  bindOnCallbackQueryEvent(bot: Telegraf<Context<Update>>): IBotCore;
  rawMessage(context: Context): Promise<void>;
  callbackQuery(context: Context): Promise<void>;
  flushFlow(id: number): Promise<void>;
  getContext(telegramId: number): Promise<CoreContextType>;
}

export class BotCore implements IBotCore {
  private readonly _scripts: Scriptor[];
  private readonly _preDefinedAdmins: number[];

  private _flowKeyToScriptMap: { [key: string]: Scriptor };

  constructor(options: CoreOptionsType, dependencies: CoreDependenciesType) {
    this._scripts = options.scripts;
    this._preDefinedAdmins = options.preDefinedAdmins;
  }

  bindOnMessageEvent(bot: Telegraf<Context<Update>>): IBotCore {
    bot.on("message", (context) => this.rawMessage(context));
    return this;
  }

  bindOnCallbackQueryEvent(bot: Telegraf<Context<Update>>): IBotCore {
    bot.on("callback_query", (context) => this.callbackQuery(context));
    return this;
  }

  bindEntryPoints(bot: Telegraf<Context<Update>>): IBotCore {
    for (const script of this._scripts) {
      const { command, cb } = script.entryPoint;
      bot.command(command, async (context: Context) => cb(context, this));
      logger.info(`Binding ${command}->${script.name}`);
    }

    return this;
  }

  flushFlow(id: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async getContext(telegramId: number): Promise<CoreContextType> {
    return {
      volonteerId: 0,
      volonteerRole: "string",
      volonteerName: "string",
      telegramId: 0,
      telegramUsername: 0,
      telegramName: "string",
      flowKey: "string",
      lastMessage: "string",
    };
  }

  async rawMessage(context: Context<Update>): Promise<void> {
    const coreCtx = await this.getContext(context.from.id);

    try {
      const script = this._flowKeyToScriptMap[coreCtx.flowKey];
      await script.execute(context, coreCtx, this);
    } catch (err) {
      logger.error(
        `Error in rawMessageHandler while processing stage ${coreCtx.flowKey}, reason:`,
      );
      logger.error(err.message);
      context.reply(
        `Error in rawMessageHandler while processing stage ${coreCtx.flowKey}, reason: ` +
          err.message,
      );
      return;
    }
  }

  callbackQuery(context: Context<Update>): Promise<void> {
    throw new Error("Method not implemented.");
  }

  generateFlowToScriptMap(): IBotCore {
    return this;
  }
}
