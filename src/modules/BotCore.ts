import { Context, Telegraf } from "telegraf";
import { IScriptor } from "../helpers/Scriptor";
import { IImpact } from "../helpers/Impact";
import { CallbackQuery, Update } from "telegraf/typings/core/types/typegram";
import logger from "../logger";

type CoreComponentsType = {
  name: string;
  component: any;
};

type CoreOptionsType = {
  preDefinedAdmins: number[];
  scripts: IScriptor[];
  callbacks: IImpact[];
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
  rawMessage(context: Context, noScriptCb: OnProblemFunctionType, onErr: OnProblemFunctionType): Promise<void>;
  callbackQuery(context: Context<Update.CallbackQueryUpdate>): Promise<void>;
  flushStage(telegramId: number): void;
  getSession(telegramId: number): SessionItem;
  addModule<T>(name: string, instance: T): IBotCore;
  getModule<T>(name: string): T | null;
  addMiddleware(bot: Telegraf<Context<Update>>, middleware: MiddlewareFunctionType): IBotCore;
  sessions: { [key: number]: SessionItem };
  init(bot: Telegraf<Context<Update>>): IBotCore;
  setSession(telegramId: number, session: SessionItem): SessionItem;
  components: { [key: string]: any };
}

export class BotCore implements IBotCore {
  private readonly _scripts: IScriptor[];
  private readonly _callbacks: IImpact[];
  private readonly _preDefinedAdmins: number[];
  private readonly _sessions: { [key: number]: SessionItem };
  private readonly _availableCom: string[] = [];

  private _components: { [key: string]: any };
  private _flowKeyToScriptMap: { [key: string]: IScriptor };

  constructor(options: CoreOptionsType, components: CoreComponentsType[]) {
    this._scripts = options.scripts;
    this._preDefinedAdmins = options.preDefinedAdmins;
    this._flowKeyToScriptMap = {};
    this._sessions = {};
    this._components = {};
    this._callbacks = options.callbacks;

    for (const cmp in components) {
      const { name, component } = components[cmp];

      logger.info(`[BotCore] Registered component <${name}>`);
      this.components[name] = component;
    }
  }

  setSession(telegramId: number, session: SessionItem): SessionItem {
    logger.info(
      `[BotCore] Update session variables for <${telegramId}> stage: <${session.stage}> lastMessage: <${session.lastMessage}>`,
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

  addMiddleware(bot: Telegraf<Context<Update>>, middleware: MiddlewareFunctionType): IBotCore {
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
    bot.on("callback_query", async (context) => await this.callbackQuery(context));
    return this;
  }

  bindScriptsCommands(bot: Telegraf<Context<Update>>): IBotCore {
    for (const script of this._scripts) {
      const { command, cb } = script.entryPoint;

      logger.info(`[BotCore.bindScriptsCommands] Bind command /${command} for script ${script.name}`);

      bot.command(command, async (context: Context) => {
        await cb(context, this);
        this.setSession(context.from.id, {
          lastMessage: context.text.trim(),
          stage: script.getFirstStage(),
        });
      });

      this._availableCom.push(command);

      logger.info(
        `[BotCore.bindScriptsCommands] Complete bind point for ${script.name}, points list: [${script.stages.join(",")}]`,
      );
    }

    logger.info(`[BotCore.bindScriptsCommands] List of available commands:`);
    for (const cmd of this._availableCom) {
      logger.info(`[BotCore.bindScriptsCommands] Top-level command "${cmd}"`);
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
    return this._sessions[telegramId] ? this._sessions[telegramId] : { stage: "", lastMessage: "" };
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
      logger.info(`[BotCore.rawMessage] Executing script for stage: ${stage}...`);
      await script.execute(context, this);
    } catch (err) {
      logger.error(`[BotCore.rawMessage] Error while execution stage '${stage}' script, reason:`);
      logger.error(err.message);
      this.flushStage(fromId);
      await onErr(context, this);
      return;
    }
  }

  async callbackQuery(context: Context<Update.CallbackQueryUpdate>): Promise<void> {
    const { data } = context.update.callback_query as CallbackQuery.DataQuery;

    logger.info(`[BotCore.callbackQuery] Incoming callback query from ${context.from.id}, with data <${data}>`);

    const lambda = this._callbacks.find((lambda) => lambda.signature.test(data));

    if (!lambda) {
      context.telegram.deleteMessage(context.chat.id, context.msgId);
      logger.error(`[BotCore.callbackQuery] Callback for <${data}> not found`);
      return;
    }

    try {
      await lambda.callback(context, this);
    } catch (err) {
      context.telegram.deleteMessage(context.chat.id, context.msgId);
      logger.error(`[BotCore.callbackQuery] Error while processing query <${data}>, reason:`);
      logger.error(err.message);
      return;
    }

    return;
  }

  generateStageToScriptorMap(): IBotCore {
    for (const script of this._scripts) {
      for (const stage of script.stages) {
        this._flowKeyToScriptMap[stage] = script;

        logger.info(`[BotCore.generateStageToScriptorMap] Add stage ${stage}->${script.name}`);
      }

      logger.info(`[BotCore.generateStageToScriptorMap] Complete load stages for ${script.name}`);
    }

    return this;
  }
}
