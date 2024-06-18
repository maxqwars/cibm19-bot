import { Context } from "telegraf";
import { IBotCore } from "../modules/BotCore";
import { Update } from "telegraf/typings/core/types/typegram";
import logger from "../logger";

type EntryPointType = {
  command: string;
  cb: { (context: Context, core: IBotCore): Promise<boolean> };
};

type StageHandlerType = {
  (context: Context, core: IBotCore): Promise<boolean>;
};

type KeyToHandlerMapItemType = {
  handler: StageHandlerType;
};

type ScriptorOptionsType = {
  name: string;
  entryPoint: EntryPointType;
};

export interface IScriptor {
  stages: string[];
  addStage(handler: StageHandlerType): IScriptor;
  execute(context: Context<Update>, core: IBotCore): Promise<void>;
  entryPoint: EntryPointType;
  name: string;
  getFirstStage(): string;
}

export interface IScriptorConstructable {
  new (options: ScriptorOptionsType): IScriptor;
}

export class Scriptor implements IScriptor {
  private readonly _name: string;
  private readonly _stages: string[];
  private readonly _entryPoint: EntryPointType;
  private _keyToHandleMap: { [key: string]: KeyToHandlerMapItemType };

  constructor(options: ScriptorOptionsType) {
    this._name = options.name;
    this._stages = [];
    this._entryPoint = options.entryPoint;
    this._keyToHandleMap = {};
  }

  get stages() {
    return this._stages;
  }

  get entryPoint() {
    return this._entryPoint;
  }

  get name() {
    return this._name;
  }

  getFirstStage(): string {
    return this.stages[0];
  }

  async execute(context: Context<Update>, core: IBotCore) {
    const { stage } = core.getSession(context.from.id);
    const { handler } = this._keyToHandleMap[stage];
    const stageIndex = Number(stage.split("_")[stage.split("_").length - 1]);
    const isLastStage = stageIndex >= this._stages.length;

    logger.info(`[Scriptor] Processing script: ${this.name}, stage: ${stage}`);

    try {
      const operationSuccess = await handler(context, core);

      if (!operationSuccess) {
        return;
      }

      if (isLastStage) {
        logger.info(`[Scriptor] Script ${this.name} is end, flush session...`);
        core.flushStage(context.from.id);
        return;
      }

      logger.info(`[Scriptor] Set next stage for script ${this.name}: ${stage}->${this._name}_${stageIndex + 1}`);

      core.setSession(context.from.id, {
        stage: `${this._name}_${stageIndex + 1}`,
        lastMessage: context.text,
      });
    } catch (err) {
      logger.error(`Error while processing script "${this.name}" on stage "${stage}", reason:`);
      logger.error(err.message);
      return;
    }
  }

  addStage(handler: StageHandlerType): IScriptor {
    const stage = this._stages.length === 0 ? `${this._name}_1` : `${this._name}_${this._stages.length + 1}`;

    this._keyToHandleMap[stage] = {
      handler,
    };

    logger.info(`[Scriptor] Added new stage ${stage} to script ${this.name}`);
    this._stages.push(stage);
    return this;
  }
}
