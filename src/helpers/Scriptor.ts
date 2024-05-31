import { Context } from "telegraf";
import { IBotCore } from "../modules/BotCore";
import { Update } from "telegraf/typings/core/types/typegram";
import logger from "../logger";

type EntryPointType = {
  command: string;
  cb: { (context: Context, core: IBotCore): Promise<void> };
};

type StageHandlerType = {
  (context: Context, core: IBotCore): Promise<void>;
};

type KeyToHandlerMapItemType = {
  handler: StageHandlerType;
};

type ScriptorOptionsType = {
  name: string;
  entryPoint: EntryPointType;
};

interface IScriptor {
  flowKeys: string[];
  addStage(handler: StageHandlerType): IScriptor;
  execute(context: Context<Update>, core: IBotCore): Promise<void>;
  entryPoint: EntryPointType;
  name: string;
  getFirstStage(): string;
}

interface IScriptorConstructable {
  new (options: ScriptorOptionsType): IScriptor;
}

export class Scriptor implements IScriptor {
  private readonly _name: string;
  private readonly _flowKeys: string[];
  private readonly _entryPoint: EntryPointType;
  private _keyToHandleMap: { [key: string]: KeyToHandlerMapItemType };

  constructor(options: ScriptorOptionsType) {
    this._name = options.name;
    this._flowKeys = [];
    this._entryPoint = options.entryPoint;
    this._keyToHandleMap = {};
  }

  get flowKeys() {
    return this._flowKeys;
  }

  get entryPoint() {
    return this._entryPoint;
  }

  get name() {
    return this._name;
  }

  getFirstStage(): string {
    return this.flowKeys[0];
  }

  async execute(context: Context<Update>, core: IBotCore) {
    const { stage } = core.getSession(context.from.id);
    const { handler } = this._keyToHandleMap[stage];
    const stageIndex = Number(stage.split("_")[stage.split("_").length - 1]);
    const isLastStage = stageIndex >= this._flowKeys.length;

    logger.info(`[Scriptor] Processing script: ${this.name}, stage: ${stage}`);
    await handler(context, core);

    if (isLastStage) {
      core.flushStage(context.from.id);
      return;
    }

    core.setSession(context.from.id, {
      stage: `${this._name}_${stageIndex + 1}`,
      lastMessage: context.text,
    });
  }

  addStage(handler: StageHandlerType): IScriptor {
    const key =
      this._flowKeys.length === 0
        ? `${this._name}_1`
        : `${this._name}_${this._flowKeys.length + 1}`;

    this._keyToHandleMap[key] = {
      handler,
    };

    this._flowKeys.push(key);

    return this;
  }
}
