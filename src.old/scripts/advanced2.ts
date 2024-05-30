import { Scriptor } from "../helpers/Scriptor";
import { BotCore, BotCoreContextType } from "../modules/BotCore";
import { Context } from "telegraf";

const ADVANCED_SCRPT_STAGES = {
  ADV_SCRPT_STAGE_1: "ADV_SCRPT_STAGE_1",
  ADV_SCRPT_STAGE_2: "ADV_SCRPT_STAGE_2",
  ADV_SCRPT_STAGE_3: "ADV_SCRPT_STAGE_3",
  ADV_SCRPT_STAGE_4: "ADV_SCRPT_STAGE_4",
};

const advancedScript = (
  context: Context,
  coreContext: BotCoreContextType,
  core: BotCore,
) => {
  return new Promise((resolve, reject) => {
    (async (
      context: Context,
      coreContext: BotCoreContextType,
      core: BotCore,
    ) => {})(context, coreContext, core)
      .then(async () => {
        await core.volonteers.updateVolonteerFlowNextHandlerKey(
          coreContext.id,
          "",
        );
        context.reply(`Stage 1 passed`);
        resolve(null);
        return;
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const advancedScript2 = new Scriptor({
  stages: Object.keys(ADVANCED_SCRPT_STAGES),
  handler: advancedScript,
  initialCommand: {
    command: "advanced",
    callback: async (context: Context, core: BotCore) => {
      const { id } = await core.getCoreContext(context.from.id);
      await core.volonteers.updateVolonteerFlowNextHandlerKey(
        id,
        Object.keys(ADVANCED_SCRPT_STAGES)[0],
      );
      context.reply(`Sequence started...`);
      return;
    },
  },
});
