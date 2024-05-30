import { Context } from "telegraf";
import { Scriptor } from "../helpers/Scriptor";
import { Update } from "telegraf/typings/core/types/typegram";

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
  new (options: CoreOptionsType, dependencies: CoreDependenciesType): IBotCore;
}

interface IBotCore {
  generateFlowToScriptMap(): void;
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
  flushFlow(id: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getContext(telegramId: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  rawMessage(context: Context<Update>): Promise<void> {
    throw new Error("Method not implemented.");
  }

  generateFlowToScriptMap(): void {
    throw new Error("Method not implemented.");
  }
}
