import { Context, Telegraf } from "telegraf";
import { Scriptor } from "../helpers/Scriptor";
import { Update } from "telegraf/typings/core/types/typegram";
import logger from "../logger";

type CoreDependenciesType = {};

type CoreOptionsType = {
  preDefinedAdmins: number[];
  scripts: Scriptor[];
};

type MiddlewareFunctionType = {
  (context: Context, core: IBotCore): Promise<void>;
};

type OnProblemFunctionType = {
  (context: Context, core: IBotCore): Promise<void>;
};

type SessionItem = {
  stage: string;
  lastMessage: string;
};

interface IBotCoreConstructable {
  new (options: CoreOptionsType, dependencies: CoreDependenciesType): IBotCore;
}

export interface IBotCore {
  generateFlowToScriptMap(): IBotCore;
  bindEntryPoints(bot: Telegraf<Context<Update>>): IBotCore;
  bindOnMessageEvent(
    bot: Telegraf<Context<Update>>,
    noScriptCb: OnProblemFunctionType,
    onErr: OnProblemFunctionType,
  ): IBotCore;
  bindOnCallbackQueryEvent(bot: Telegraf<Context<Update>>): IBotCore;
  rawMessage(
    context: Context,
    noScriptCb: OnProblemFunctionType,
    onErr: OnProblemFunctionType,
  ): Promise<void>;
  callbackQuery(context: Context): Promise<void>;
  flushStage(telegramId: number): void;
  getSession(telegramId: number): SessionItem;
  addModule<T>(name: string, instance: T): IBotCore;
  getModule<T>(name: string): T | null;
  addMiddleware(
    bot: Telegraf<Context<Update>>,
    middleware: MiddlewareFunctionType,
  ): IBotCore;
  modules: string[];
  sessions: { [key: number]: SessionItem };
  init(bot: Telegraf<Context<Update>>): IBotCore;
  setSession(telegramId: number, session: SessionItem): SessionItem;
}

export class BotCore implements IBotCore {
  private readonly _scripts: Scriptor[];
  private readonly _preDefinedAdmins: number[];
  private readonly _sessions: { [key: number]: SessionItem };

  private _modules: { [key: string]: any };
  private _flowKeyToScriptMap: { [key: string]: Scriptor };

  constructor(options: CoreOptionsType, dependencies: CoreDependenciesType) {
    this._scripts = options.scripts;
    this._preDefinedAdmins = options.preDefinedAdmins;
    this._flowKeyToScriptMap = {};
    this._sessions = {};
  }

  setSession(telegramId: number, session: SessionItem): SessionItem {
    logger.info(
      `Update session variables for ${telegramId}. stage: ${session.stage}, lastMessage: ${session.lastMessage}`,
    );
    this._sessions[telegramId] = session;
    return session;
  }

  init(bot: Telegraf<Context<Update>>): IBotCore {
    bot.use((context, next) => {
      if (!Object.hasOwn(this._sessions, context.from.id)) {
        this.setSession(context.from.id, {
          lastMessage: "",
          stage: "",
        });
      }
      next();
    });
    return this;
  }

  get modules() {
    return Object(this._modules).keys;
  }

  get sessions() {
    return this._sessions;
  }

  addMiddleware(
    bot: Telegraf<Context<Update>>,
    middleware: MiddlewareFunctionType,
  ): IBotCore {
    bot.use((context: Context, next) => {
      middleware(context, this)
        .then(() => next())
        .catch((err) => logger.error(err.message));
    });

    return this;
  }

  getModule<T>(name: string): null | T {
    const module = this._modules[name];
    return module !== null ? (module as T) : null;
  }

  addModule<T>(name: string, instance: T): IBotCore {
    this._modules[name] = instance;
    return this;
  }

  bindOnMessageEvent(
    bot: Telegraf<Context<Update>>,
    noScriptCb: OnProblemFunctionType,
    onErr: OnProblemFunctionType,
  ): IBotCore {
    bot.on("message", (context) => this.rawMessage(context, noScriptCb, onErr));
    return this;
  }

  bindOnCallbackQueryEvent(bot: Telegraf<Context<Update>>): IBotCore {
    bot.on("callback_query", (context) => this.callbackQuery(context));
    return this;
  }

  bindEntryPoints(bot: Telegraf<Context<Update>>): IBotCore {
    for (const script of this._scripts) {
      const { command, cb } = script.entryPoint;
      bot.command(command, async (context: Context) => {
        await cb(context, this);
        this.setSession(context.from.id, {
          lastMessage: context.text.trim(),
          stage: script.getFirstStage(),
        });
      });
      logger.info(`Binding ${command}->${script.name}`);
    }

    return this;
  }

  flushStage(telegramId: number): void {
    this._sessions[telegramId] = {
      stage: "",
      lastMessage: "",
    };
  }

  getSession(telegramId: number): SessionItem {
    return this._sessions[telegramId]
      ? this._sessions[telegramId]
      : { stage: "", lastMessage: "" };
  }

  async rawMessage(
    context: Context<Update>,
    noScriptCb: OnProblemFunctionType,
    onErr: OnProblemFunctionType,
  ): Promise<void> {
    const fromId = context.from.id;
    const { stage } = this.getSession(fromId);
    const script = this._flowKeyToScriptMap[stage];

    if (!Object.hasOwn(script, "execute")) {
      await noScriptCb(context, this);
      return;
    }

    try {
      logger.info(`Executing script for stage: ${stage}...`);
      await script.execute(context, this);
    } catch (err) {
      logger.error(`Error while execution stage '${stage}' script, reason:`);
      logger.error(err.message);
      // this.flushStage(fromId);
      await onErr(context, this);
      return;
    }
  }

  callbackQuery(context: Context<Update>): Promise<void> {
    throw new Error("Method not implemented.");
  }

  generateFlowToScriptMap(): IBotCore {
    for (const script of this._scripts) {
      for (const key of script.flowKeys) {
        this._flowKeyToScriptMap[key] = script;
        logger.info(`Added ${key}->${script.name}`);
      }
      logger.info(`Complete binding handlers for ${script.name}`);
    }

    return this;
  }
}
