import { Context, Telegraf } from "telegraf";
import { IScriptor } from "../helpers/Scriptor";
import { IImpact } from "../helpers/Impact";
import { CallbackQuery, Update } from "telegraf/typings/core/types/typegram";
import { Logger } from "simple-node-logger";

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
  new (logger: Logger, options: CoreOptionsType, components: CoreComponentsType): IBotCore;
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
  logger: Logger
}

export class BotCore implements IBotCore {
  private readonly _scripts: IScriptor[];
  private readonly _callbacks: IImpact[];
  private readonly _preDefinedAdmins: number[];
  private readonly _sessions: { [key: number]: SessionItem };
  private readonly _availableCom: string[] = [];

  private readonly _logger: Logger;

  private _components: { [key: string]: any };
  private _flowKeyToScriptMap: { [key: string]: IScriptor };

  constructor(logger: Logger, options: CoreOptionsType, components: CoreComponentsType[]) {
    this._scripts = options.scripts;
    this._preDefinedAdmins = options.preDefinedAdmins;
    this._flowKeyToScriptMap = {};
    this._sessions = {};
    this._components = {};
    this._callbacks = options.callbacks;

    this._logger = logger;

    for (const cmp in components) {
      const { name, component } = components[cmp];
      this._logger.debug(`[BotCore.constructor] Added component ${name}`);
      this.components[name] = component;
    }
  }

  get logger() {
    return this._logger
  }

  setSession(telegramId: number, session: SessionItem): SessionItem {
    this._logger.debug(
      `[BotCore.setSession] Update session variables for ID ${telegramId} stage change to "${session.stage}" last message change to "${session.lastMessage}"`,
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
        .catch((err) => this._logger.error(err.message));
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

      this._logger.debug(`[BotCore.bindScriptsCommands] Bind command /${command} for script ${script.name}`);

      bot.command(command, async (context: Context) => {
        await cb(context, this);
        this.setSession(context.from.id, {
          lastMessage: context.text.trim(),
          stage: script.getFirstStage(),
        });
      });

      this._availableCom.push(command);

      this._logger.debug(
        `[BotCore.bindScriptsCommands] Complete bind point for ${script.name}, points list: [${script.stages.join(",")}]`,
      );
    }

    for (const cmd of this._availableCom) {
      this._logger.info(`[BotCore.bindScriptsCommands] Register command "/${cmd}"`);
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
      this._logger.debug(`[BotCore.rawMessage] Executing script for stage: ${stage}...`);
      await script.execute(context, this);
    } catch (err) {
      this._logger.error(`[BotCore.rawMessage] Error while execution stage '${stage}' script, reason:`);
      this._logger.error(err.message);
      this.flushStage(fromId);
      await onErr(context, this);
      return;
    }
  }

  async callbackQuery(context: Context<Update.CallbackQueryUpdate>): Promise<void> {
    const { data } = context.update.callback_query as CallbackQuery.DataQuery;

    this._logger.debug(`[BotCore.callbackQuery] Incoming callback query from ${context.from.id}, with data <${data}>`);

    const callback = this._callbacks.find((lambda) => lambda.signature.test(data));

    if (!callback) return;

    this._logger.debug(`[BotCore.callbackQuery] selected callback for query ${data} -> ${callback.name}`);

    // if (!callback) {
    //   context.telegram.deleteMessage(context.chat.id, context.msgId);
    //   logger.error(`[BotCore.callbackQuery] Callback for <${data}> not found`);
    //   return;
    // }

    try {
      await callback.callback(context, this);
    } catch (err) {
      context.telegram.deleteMessage(context.chat.id, context.msgId);
      this._logger.error(`[BotCore.callbackQuery] Error while processing query <${data}>, reason:`);
      this._logger.error(err.message);
      return;
    }

    return;
  }

  generateStageToScriptorMap(): IBotCore {
    for (const script of this._scripts) {
      for (const stage of script.stages) {
        this._flowKeyToScriptMap[stage] = script;
        this._logger.debug(
          `[BotCore.generateStageToScriptorMap] Register association stage "${stage}" to script "${script.name}"`,
        );
      }
      this._logger.debug(`[BotCore.generateStageToScriptorMap] Complete registration script "${script.name}"`);
    }

    return this;
  }
}
