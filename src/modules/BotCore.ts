import { Context, Telegraf } from "telegraf";
import { Scriptor } from "../helpers/Scriptor";
import { Update } from "telegraf/typings/core/types/typegram";
import logger from "../logger";

type CoreComponentsType = {
  name: string;
  component: any;
};

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
  new (options: CoreOptionsType, components: CoreComponentsType): IBotCore;
}

export interface IBotCore {
  generateStageToScriptorMap(): IBotCore;
  bindScriptsCommands(bot: Telegraf<Context<Update>>): IBotCore;
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
  sessions: { [key: number]: SessionItem };
  init(bot: Telegraf<Context<Update>>): IBotCore;
  setSession(telegramId: number, session: SessionItem): SessionItem;
  components: { [key: string]: any };
}

export class BotCore implements IBotCore {
  private readonly _scripts: Scriptor[];
  private readonly _preDefinedAdmins: number[];
  private readonly _sessions: { [key: number]: SessionItem };

  private _components: { [key: string]: any };
  private _flowKeyToScriptMap: { [key: string]: Scriptor };

  constructor(options: CoreOptionsType, components: CoreComponentsType[]) {
    this._scripts = options.scripts;
    this._preDefinedAdmins = options.preDefinedAdmins;
    this._flowKeyToScriptMap = {};
    this._sessions = {};
    this._components = {};

    for (const cmp in components) {
      const { name, component } = components[cmp];

      logger.info(`[BotCore] Registered component ${name}...`);
      this.components[name] = component;
    }
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

  get components() {
    return this._components;
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
    const module = this._components[name];
    return module !== null ? (module as T) : null;
  }

  addModule<T>(name: string, instance: T): IBotCore {
    this._components[name] = instance;
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

  bindScriptsCommands(bot: Telegraf<Context<Update>>): IBotCore {
    for (const script of this._scripts) {
      const { command, cb } = script.entryPoint;
      logger.info(
        `[BotCore.bindScriptsCommands] Bind command /${command} for script ${script.name}`,
      );
      bot.command(command, async (context: Context) => {
        await cb(context, this);
        this.setSession(context.from.id, {
          lastMessage: context.text.trim(),
          stage: script.getFirstStage(),
        });
      });
      logger.info(
        `[BotCore.bindScriptsCommands] Complete bind point for ${script.name}, points list: [${script.stages.join(",")}]`,
      );
    }

    return this;
  }

  flushStage(telegramId: number): void {
    const { lastMessage } = this.getSession(telegramId);
    this.setSession(telegramId, {
      stage: "",
      lastMessage,
    });
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

    if (!script) {
      await noScriptCb(context, this);
      return;
    }

    try {
      logger.info(
        `[BotCore.rawMessage] Executing script for stage: ${stage}...`,
      );
      await script.execute(context, this);
    } catch (err) {
      logger.error(
        `[BotCore.rawMessage] Error while execution stage '${stage}' script, reason:`,
      );
      logger.error(err.message);
      this.flushStage(fromId);
      await onErr(context, this);
      return;
    }
  }

  callbackQuery(context: Context<Update>): Promise<void> {
    throw new Error("Method not implemented.");
  }

  generateStageToScriptorMap(): IBotCore {
    for (const script of this._scripts) {
      for (const stage of script.stages) {
        this._flowKeyToScriptMap[stage] = script;
        logger.info(
          `[BotCore.generateStageToScriptorMap] Add stage ${stage}->${script.name}`,
        );
      }
      logger.info(
        `[BotCore.generateStageToScriptorMap] Complete load stages for ${script.name}`,
      );
    }

    return this;
  }
}
